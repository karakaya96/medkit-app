"""End-to-end smoke test for the medkit backend.

Run this before a demo to confirm the free-tier pipeline is configured.
It checks /health and, when an OpenRouter key is present, one live ESI
classification. Every call is free-tier; no Anthropic key is involved.

Usage:

    backend/.venv/bin/python backend/smoke_test.py

Exits 0 if every step passes, 1 otherwise.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from typing import Optional

BASE = "http://127.0.0.1:8787"
TIMEOUT = 90.0


def _request(
    method: str,
    path: str,
    body: Optional[dict] = None,
) -> tuple[int, dict | str]:
    url = f"{BASE}{path}"
    data = None
    headers: dict[str, str] = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            payload = resp.read().decode("utf-8", errors="replace")
            status = resp.status
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", errors="replace")
        status = e.code
    try:
        return status, json.loads(payload)
    except ValueError:
        return status, payload


class Reporter:
    def __init__(self) -> None:
        self.passed = 0
        self.failures: list[str] = []

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        if ok:
            self.passed += 1
            print(f"PASS  {name}")
            return
        self.failures.append(f"{name} — {detail}")
        print(f"FAIL  {name}  ({detail})")

    def done(self) -> int:
        print(f"\n{self.passed} passed, {len(self.failures)} failed.")
        return 1 if self.failures else 0


def main() -> int:
    r = Reporter()

    status, body = _request("GET", "/health")
    r.check("GET /health returns 200", status == 200, f"status={status}")
    if not isinstance(body, dict):
        r.check("health body parses as JSON", False, str(body))
        return r.done()

    r.check("health: ok", body.get("ok") is True, f"got {body.get('ok')!r}")
    voice = body.get("voice") or {}
    r.check(
        "health: STT is faster-whisper",
        voice.get("stt") == "faster-whisper",
        f"got {voice.get('stt')!r}",
    )
    r.check(
        "health: TTS is edge-tts",
        voice.get("tts") == "edge-tts",
        f"got {voice.get('tts')!r}",
    )
    grading = body.get("grading") or {}
    r.check(
        "health: grading uses OpenRouter",
        grading.get("provider") == "openrouter",
        f"got {grading.get('provider')!r}",
    )
    r.check(
        "health: OpenRouter key configured",
        bool(grading.get("api_key_configured")),
        "set OPENROUTER_API_KEY in backend/.env.local",
    )
    r.check(
        "health: no Anthropic/Grading secrets leaked",
        "api_key" not in grading and "anthropic" not in grading,
        "health payload leaks a secret or paid-provider field",
    )
    if not grading.get("api_key_configured"):
        return r.done()

    status, body = _request(
        "POST",
        "/agent/triage/classify",
        {
            "patient_id": "smoke-stemi",
            "chief_complaint": "Göğüs ağrısı, terleme",
            "vitals": {
                "hr": 104,
                "bp_systolic": 152,
                "bp_diastolic": 94,
                "spo2": 95,
                "rr": 22,
                "temp_c": 36.8,
            },
            "ecg_findings": "ST elevation in II, III, aVF",
        },
    )
    r.check("POST /agent/triage/classify returns 200", status == 200, f"status={status} body={body}")
    if isinstance(body, dict):
        r.check(
            "triage: STEMI classified critical",
            body.get("esi_level") == "critical",
            f"got {body.get('esi_level')!r}",
        )
        r.check(
            "triage: rationale is non-empty",
            bool(str(body.get("rationale", "")).strip()),
            "empty rationale",
        )

    return r.done()


if __name__ == "__main__":
    sys.exit(main())
