"""Debrief grader: score math and defensive parsing (no live API calls)."""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

os.environ.setdefault("OPENROUTER_API_KEY", "sk-or-v1-test-dummy")
os.environ.setdefault("BACKEND_SHARED_SECRET", "test-shared-secret-7fd1")

_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import server  # noqa: E402


def _fake_client(payload: dict) -> MagicMock:
    client = MagicMock()
    client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
    )
    return client


RUBRIC = {
    "data_gathering": [
        {"criterion_id": "dg-1", "weight": 2},
        {"criterion_id": "dg-2", "weight": 1},
    ],
    "clinical_management": [
        {"criterion_id": "cm-1", "weight": 1},
    ],
    "interpersonal": [],
}

REGISTRY = [
    {
        "id": "nice",
        "recommendations": [{"recId": "1.1"}, {"recId": "1.2"}],
    }
]


def _request() -> server.DebriefRequest:
    return server.DebriefRequest(
        case_id="case-1",
        case_summary={"chief_complaint": "chest pain"},
        rubric=RUBRIC,
        registry_slice=REGISTRY,
        encounter_log={"history_questions_asked": []},
    )


class DebriefGradingTests(unittest.TestCase):
    def test_band_thresholds(self) -> None:
        self.assertEqual(server._band(0.85), "excellent")
        self.assertEqual(server._band(0.70), "good")
        self.assertEqual(server._band(0.55), "satisfactory")
        self.assertEqual(server._band(0.40), "borderline")
        self.assertEqual(server._band(0.39), "clear-fail")

    def test_scores_are_computed_from_weights(self) -> None:
        payload = {
            "criteria": [
                {"criterion_id": "dg-1", "verdict": "met", "evidence": "Sordu."},
                {"criterion_id": "dg-2", "verdict": "partially-met", "evidence": "Kısmen."},
                {"criterion_id": "cm-1", "verdict": "met", "evidence": "Yaptı.",
                 "guideline_ref": "nice:1.1"},
            ],
            "safety_breach": None,
            "highlights": ["İyi öykü."],
            "improvements": ["EKG."],
            "narrative": "Genel olarak iyi bir görüşme.",
        }
        result = server.run_debrief_evaluation_openai(_fake_client(payload), _request())
        ev = result.evaluation
        self.assertEqual(ev["domain_scores"]["data_gathering"]["raw"], 2.5)
        self.assertEqual(ev["domain_scores"]["data_gathering"]["max"], 3.0)
        self.assertEqual(ev["domain_scores"]["data_gathering"]["verdict"], "good")
        self.assertEqual(ev["domain_scores"]["clinical_management"]["verdict"], "excellent")
        self.assertEqual(ev["global_rating"], "excellent")
        self.assertEqual(result.model, server.GRADER_MODEL)

    def test_invented_guideline_ref_is_dropped(self) -> None:
        payload = {
            "criteria": [
                {"criterion_id": "dg-1", "verdict": "met", "evidence": "Sordu."},
                {"criterion_id": "dg-2", "verdict": "met", "evidence": "Sordu."},
                {"criterion_id": "cm-1", "verdict": "met", "evidence": "Yaptı.",
                 "guideline_ref": "fake:9.9"},
            ],
            "safety_breach": {"what": "Kontrendike ilaç.", "guideline_ref": "fake:9.9"},
            "highlights": [],
            "improvements": [],
            "narrative": "Değerlendirme.",
        }
        ev = server.run_debrief_evaluation_openai(_fake_client(payload), _request()).evaluation
        cm = next(c for c in ev["criteria"] if c["criterion_id"] == "cm-1")
        self.assertIsNone(cm["guideline_ref"])
        self.assertIsNone(ev["safety_breach"]["guideline_ref"])

    def test_missing_criterion_is_missed_not_dropped(self) -> None:
        payload = {
            "criteria": [
                {"criterion_id": "dg-1", "verdict": "met", "evidence": "Sordu."},
            ],
            "safety_breach": None,
            "highlights": ["İyi."],
            "improvements": ["Eksik."],
            "narrative": "Değerlendirme.",
        }
        ev = server.run_debrief_evaluation_openai(_fake_client(payload), _request()).evaluation
        ids = [c["criterion_id"] for c in ev["criteria"]]
        self.assertEqual(ids, ["dg-1", "dg-2", "cm-1"])
        missing = next(c for c in ev["criteria"] if c["criterion_id"] == "dg-2")
        self.assertEqual(missing["verdict"], "missed")

    def test_truncated_json_is_salvaged(self) -> None:
        truncated = json.dumps({
            "criteria": [
                {"criterion_id": "dg-1", "verdict": "met", "evidence": "Sordu."},
            ],
            "safety_breach": None,
            "highlights": [],
            "improvements": [],
            "narrative": "Uzun bir anlatı",
        }, ensure_ascii=False)[:210]
        client = MagicMock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(
                message=SimpleNamespace(content=truncated),
                finish_reason="length",
            )],
            model=server.GRADER_MODEL,
        )
        ev = server.run_debrief_evaluation_openai(client, _request()).evaluation
        self.assertEqual([c["criterion_id"] for c in ev["criteria"]], ["dg-1", "dg-2", "cm-1"])
        self.assertEqual(ev["criteria"][1]["verdict"], "missed")
        self.assertTrue(ev["narrative"])

    def test_malformed_json_is_retried(self) -> None:
        valid = json.dumps({
            "criteria": [
                {"criterion_id": "dg-1", "verdict": "met", "evidence": "Sordu."},
            ],
            "safety_breach": None,
            "highlights": ["İyi."],
            "improvements": ["Eksik."],
            "narrative": "Değerlendirme.",
        }, ensure_ascii=False)
        client = MagicMock()
        client.chat.completions.create.side_effect = [
            SimpleNamespace(
                choices=[SimpleNamespace(
                    message=SimpleNamespace(content='{"criteria": [{"criterion_id": "dg-1", "verdict'),
                    finish_reason="length",
                )],
                model=server.GRADER_MODEL,
            ),
            SimpleNamespace(
                choices=[SimpleNamespace(
                    message=SimpleNamespace(content=valid),
                    finish_reason="stop",
                )],
                model=server.GRADER_MODEL,
            ),
        ]
        ev = server.run_debrief_evaluation_openai(client, _request()).evaluation
        self.assertEqual(client.chat.completions.create.call_count, 2)
        self.assertEqual(ev["criteria"][0]["verdict"], "met")


if __name__ == "__main__":
    unittest.main()
