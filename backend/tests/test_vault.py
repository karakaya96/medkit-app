"""Unit tests for the hospital-EHR credential vault endpoint.

Run via the backend venv (so FastAPI + starlette are available):

    backend/.venv/Scripts/python.exe -m unittest backend.tests.test_vault

The tests spin up the FastAPI app in-process via ``TestClient`` so no
uvicorn or network is required. They assert that:

    1. The EHR_API_TOKEN never appears in any response body or log
       line produced by a vault lookup.
    2. Known patients return the expected record shape.
    3. Unknown patients return 404 instead of leaking the set of IDs.
    4. The endpoint returns 503 when the vault is not configured.
    5. Malformed requests are rejected by pydantic without a 500.
"""

from __future__ import annotations

import logging
import os
import sys
import unittest
from pathlib import Path

# Stub required env BEFORE importing server — it otherwise refuses to
# boot some paths.
os.environ["EHR_API_TOKEN"] = "vault-secret-test-token-93af2d"
_SHARED_SECRET = "test-shared-secret-7fd1"
os.environ["BACKEND_SHARED_SECRET"] = _SHARED_SECRET
_AUTH_HEADERS = {"x-medkit-auth": _SHARED_SECRET}

# Make ``backend/`` importable whether unittest is launched from the
# repo root or from inside ``backend/``.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402

import server  # noqa: E402


_VAULT_TOKEN = os.environ["EHR_API_TOKEN"]


class VaultEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(server.app, headers=_AUTH_HEADERS)

    # ─── happy path ──────────────────────────────────────────────
    def test_known_patient_returns_record(self) -> None:
        resp = self.client.post(
            "/agent/vault/ehr/lookup",
            json={"patient_id": "poly-001"},
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["patient_id"], "poly-001")
        self.assertEqual(body["fetched_via"], "credential-vault")
        self.assertIn("record", body)
        record = body["record"]
        self.assertEqual(record["patient_id"], "poly-001")
        self.assertIn("prior_encounters", record)
        self.assertIn("active_medications", record)
        self.assertIn("allergies", record)

    def test_second_known_patient(self) -> None:
        resp = self.client.post(
            "/agent/vault/ehr/lookup",
            json={"patient_id": "er-101"},
        )
        self.assertEqual(resp.status_code, 200, resp.text)

    # ─── token redaction (THE point of the feature) ─────────────
    def test_response_body_never_contains_vault_token(self) -> None:
        resp = self.client.post(
            "/agent/vault/ehr/lookup",
            json={"patient_id": "poly-001"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn(
            _VAULT_TOKEN,
            resp.text,
            "vault token leaked into response body",
        )

    def test_response_headers_never_contain_vault_token(self) -> None:
        resp = self.client.post(
            "/agent/vault/ehr/lookup",
            json={"patient_id": "poly-001"},
        )
        for name, value in resp.headers.items():
            self.assertNotIn(
                _VAULT_TOKEN,
                value,
                f"vault token leaked into response header {name}",
            )

    def test_log_line_never_contains_vault_token(self) -> None:
        log = logging.getLogger("medkit.agent")
        handler = _CapturingHandler()
        log.addHandler(handler)
        try:
            resp = self.client.post(
                "/agent/vault/ehr/lookup",
                json={"patient_id": "poly-001"},
            )
            self.assertEqual(resp.status_code, 200)
        finally:
            log.removeHandler(handler)
        for record in handler.records:
            # Assert against the formatted final string — includes both
            # ``%``-style args and any extra context.
            msg = record.getMessage()
            self.assertNotIn(
                _VAULT_TOKEN,
                msg,
                f"vault token leaked into log line: {msg!r}",
            )

    # ─── error paths ────────────────────────────────────────────
    def test_unknown_patient_returns_404(self) -> None:
        resp = self.client.post(
            "/agent/vault/ehr/lookup",
            json={"patient_id": "ghost-9999"},
        )
        self.assertEqual(resp.status_code, 404)

    def test_missing_patient_id_returns_422(self) -> None:
        resp = self.client.post("/agent/vault/ehr/lookup", json={})
        self.assertEqual(resp.status_code, 422)

    def test_empty_patient_id_returns_400(self) -> None:
        resp = self.client.post(
            "/agent/vault/ehr/lookup",
            json={"patient_id": "   "},
        )
        self.assertEqual(resp.status_code, 400)

    def test_vault_not_configured_returns_503(self) -> None:
        previous = os.environ.pop("EHR_API_TOKEN", None)
        try:
            resp = self.client.post(
                "/agent/vault/ehr/lookup",
                json={"patient_id": "poly-001"},
            )
            self.assertEqual(resp.status_code, 503)
            self.assertNotIn(
                "vault-secret",
                resp.text.lower(),
                "error response should not echo any token substring",
            )
        finally:
            if previous is not None:
                os.environ["EHR_API_TOKEN"] = previous

class AuthMiddlewareTests(unittest.TestCase):
    """The shared-secret gate must not be bypassable by client-controlled
    headers (Origin/Referer were previously trusted — that was a real hole)."""

    def setUp(self) -> None:
        self.client = TestClient(server.app)
        self.payload = {"patient_id": "poly-001"}
        self.url = "/agent/vault/ehr/lookup"

    def test_missing_secret_is_rejected(self) -> None:
        resp = self.client.post(self.url, json=self.payload)
        self.assertEqual(resp.status_code, 401)

    def test_spoofed_dev_origin_does_not_bypass(self) -> None:
        resp = self.client.post(
            self.url,
            json=self.payload,
            headers={"origin": "http://localhost:5173"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_spoofed_dev_referer_does_not_bypass(self) -> None:
        resp = self.client.post(
            self.url,
            json=self.payload,
            headers={"referer": "http://localhost:5173/"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_wrong_secret_is_rejected(self) -> None:
        resp = self.client.post(
            self.url,
            json=self.payload,
            headers={"x-medkit-auth": "not-the-secret"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_valid_secret_is_accepted(self) -> None:
        resp = self.client.post(self.url, json=self.payload, headers=_AUTH_HEADERS)
        self.assertEqual(resp.status_code, 200, resp.text)

    def test_health_stays_public_without_leaking_ids(self) -> None:
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["ok"])
        self.assertNotIn("api_key", body["grading"])
        self.assertNotIn("anthropic", body["grading"])


class _CapturingHandler(logging.Handler):
    def __init__(self) -> None:
        super().__init__(level=logging.DEBUG)
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


if __name__ == "__main__":
    unittest.main()
