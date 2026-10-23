"""
FastAPI backend for the medkit simulator.

Hosts the free-tier LLM proxy (debrief grading, patient text chat, ESI
triage) and the real-time voice token mint endpoint (`/voice/token`).
Real-time voice itself runs in `voice_agent.py` as a separate LiveKit
Agents worker — this server only issues access tokens and pre-creates
rooms with patient persona metadata.

All model calls use free OpenAI-compatible endpoints: NVIDIA NIM as the
primary and OpenRouter `:free` as an automatic fallback, so the simulator
needs no paid subscription. WebRTC transport is local or LiveKit Cloud free.

GET  /health         → backend + model/voice config report
POST /agent/debrief  → end-of-encounter OSCE grading (free model)
POST /agent/patient/stream → typed patient chat (free model)
POST /agent/triage/classify → ESI classification (free model)
POST /voice/token    → mint LiveKit JWT for a patient room
"""

from __future__ import annotations

import asyncio
import hmac
import ipaddress
import json
import logging
import os
import re
from pathlib import Path
from typing import Optional


def _load_env_local() -> None:
    """Minimal .env.local loader — no python-dotenv dependency.

    Reads `backend/.env.local` (next to this file) and sets any KEY=VALUE
    pair into ``os.environ`` without overwriting values already set.
    Silently no-ops if the file is missing."""
    env_path = Path(__file__).resolve().parent / ".env.local"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Overwrite if the existing value is empty (subprocesses can inherit
        # declared-but-empty env vars from the parent). Only preserve a
        # non-empty existing value.
        if key and not os.environ.get(key):
            os.environ[key] = value


_load_env_local()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

# Shared secret protects /agent/* and /voice/* against direct curl abuse.
# The browser sends this header; a missing/wrong value returns 401 before
# we burn LLM credits. Localhost origins bypass for
# `npm run dev`. The app has no hosted deployment — only local use.
SHARED_SECRET = os.environ.get("BACKEND_SHARED_SECRET", "")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

# Per-IP rate limit caps even authenticated abuse. SSE streams count as one
# request, so 120/min leaves plenty of headroom for legitimate use.
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(title="medkit Backend", version="0.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Middleware ORDER (inside-out — last added runs first on inbound):
#   1. Auth          (innermost, added first)
#   2. SlowAPI       (rate limit)
#   3. CORS          (outermost, handles OPTIONS preflight before auth)
def _is_loopback_client(request: Request) -> bool:
    """True only for connections that actually originate on this machine.

    Local development bypasses the shared secret because the Vite proxy
    (``127.0.0.1:8787``) does not inject it. This is deliberately based on
    the TCP peer address — NOT on Origin/Referer/X-Forwarded-For, which
    any client can forge.
    """
    client = request.client
    if client is None:
        return False
    host = client.host
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


@app.middleware("http")
async def require_shared_secret(request: Request, call_next):
    path = request.url.path
    # /health is public for monitoring; CORS preflight runs above this anyway
    # but bypass OPTIONS defensively.
    if path == "/health" or request.method == "OPTIONS":
        return await call_next(request)
    if _is_loopback_client(request):
        return await call_next(request)
    supplied = request.headers.get("x-medkit-auth", "")
    if SHARED_SECRET and hmac.compare_digest(supplied, SHARED_SECRET):
        return await call_next(request)
    return JSONResponse({"detail": "unauthorized"}, status_code=401)


app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Configuration report used by the UI and the voice doctor script."""
    livekit_ok = bool(
        os.environ.get("LIVEKIT_URL")
        and os.environ.get("LIVEKIT_API_KEY")
        and os.environ.get("LIVEKIT_API_SECRET")
    )
    llm_ok = bool(_provider_key(LLM_PROVIDER))
    fallback = next((p for p in provider_order() if p != LLM_PROVIDER), None)
    return {
        "ok": True,
        "voice": {
            "transport": "livekit",
            "livekit_configured": livekit_ok,
            "stt": "faster-whisper",
            "tts": "edge-tts",
            "llm_provider": LLM_PROVIDER,
            "llm_configured": llm_ok,
            "whisper_model": os.environ.get("WHISPER_MODEL", "small"),
        },
        "grading": {
            "provider": LLM_PROVIDER,
            "api_key_configured": llm_ok,
            "provider_fallback_configured": bool(fallback),
            "fallback_provider": fallback,
            "model": GRADER_MODEL,
        },
    }


try:
    from openai import OpenAI, AsyncOpenAI  # type: ignore
    _HAS_OPENAI = True
except ImportError:  # pragma: no cover
    _HAS_OPENAI = False

# Structured logger for LLM calls. Uvicorn captures stdlib logging so
# these land in the same stream as its own access log.
_agent_log = logging.getLogger("medkit.agent")
_agent_log.setLevel(logging.INFO)
if not _agent_log.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("[medkit.agent] %(levelname)s %(message)s"))
    _agent_log.addHandler(_h)

# All grading/triage/patient calls use a free OpenAI-compatible endpoint.
# NVIDIA's direct NIM endpoint has no OpenRouter free-models-per-day cap, so it
# is the preferred provider; OpenRouter remains the zero-cost fallback. Both
# models are pinned to Nemotron Lightning because the generic free router can
# spend the whole budget on hidden reasoning and return empty/truncated JSON.
DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3.5-lightning:free"
DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openrouter").strip().lower()
if LLM_PROVIDER not in ("openrouter", "nvidia"):
    LLM_PROVIDER = "openrouter"

OPENROUTER_MODELS = {
    "grader": os.environ.get(
        "OPENROUTER_GRADER_MODEL",
        os.environ.get("GRADER_MODEL", DEFAULT_OPENROUTER_MODEL),
    ),
    "triage": os.environ.get(
        "OPENROUTER_TRIAGE_MODEL",
        os.environ.get("TRIAGE_MODEL", DEFAULT_OPENROUTER_MODEL),
    ),
    "patient": os.environ.get(
        "OPENROUTER_PATIENT_MODEL",
        os.environ.get("PATIENT_MODEL", DEFAULT_OPENROUTER_MODEL),
    ),
}
NVIDIA_MODELS = {
    "grader": os.environ.get(
        "NVIDIA_GRADER_MODEL",
        os.environ.get("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL),
    ),
    "triage": os.environ.get(
        "NVIDIA_TRIAGE_MODEL",
        os.environ.get("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL),
    ),
    "patient": os.environ.get(
        "NVIDIA_PATIENT_MODEL",
        os.environ.get("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL),
    ),
}
TASK_MODELS = {"openrouter": OPENROUTER_MODELS, "nvidia": NVIDIA_MODELS}

# Kept as module constants for tests and /health; they always describe the
# primary provider.
FREE_MODEL = OPENROUTER_MODELS["grader"]
GRADER_MODEL = TASK_MODELS[LLM_PROVIDER]["grader"]
TRIAGE_MODEL = TASK_MODELS[LLM_PROVIDER]["triage"]
TRIAGE_MAX_TOKENS = 512


def _provider_key(provider: str) -> str:
    return (
        os.environ.get("NVIDIA_API_KEY", "")
        if provider == "nvidia"
        else os.environ.get("OPENROUTER_API_KEY", "")
    )


def _provider_base_url(provider: str) -> str:
    if provider == "nvidia":
        return os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    return os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")


def provider_order() -> list[str]:
    """Primary first, then the other free provider when its key is present."""
    primary = LLM_PROVIDER
    fallback = "nvidia" if primary == "openrouter" else "openrouter"
    order = [primary]
    if _provider_key(fallback):
        order.append(fallback)
    return order


def _reasoning_kwargs(provider: str) -> dict:
    if provider == "nvidia":
        # NIM needs the chat-template flag; reasoning_effort alone still let
        # the 30B model burn its budget on hidden thinking with long prompts.
        return {
            "reasoning_effort": "none",
            "extra_body": {"chat_template_kwargs": {"enable_thinking": False}},
        }
    return {"extra_body": {"reasoning": {"enabled": False}}}

DEBRIEF_SYSTEM_PROMPT = (
    "You are a senior clinician grading a trainee in a synthetic OSCE "
    "simulator. You are not a coach and you do not address a real patient. "
    "Return STRICT JSON ONLY — no prose before or after, no markdown fences.\n\n"

    "LANGUAGE (NON-NEGOTIABLE): write every human-readable value (evidence, "
    "safety_breach.what, highlights, improvements, narrative) in Turkish "
    "(tr-TR). Keep JSON keys, enum values and guideline recIds exactly as "
    "specified. English output makes the answer invalid: sentences such as "
    "'Trainee asked …', 'The trainee …' or 'No empathic response was observed' "
    "must be written as Turkish, e.g. 'Aday \"Ne yediniz?\" sorusunu sordu "
    "(encounter_log.history_questions_asked[0])' and 'Empatik yanıt "
    "gözlenmedi'. Never leave a single English sentence.\n\n"

    "The user message is one JSON object with:\n"
    "  • case_summary — chief complaint, gold-standard diagnosis id and its "
    "Turkish label (`correct_diagnosis_label`), the option ids plus their "
    "Turkish labels (`diagnosis_option_labels`, same order), severity, age, "
    "gender.\n"
    "  • rubric — three domains (data_gathering, clinical_management, "
    "interpersonal) plus optional safety_netting. Every criterion has an id, "
    "label, weight and an `evidence` string describing what counts as met.\n"
    "  • registry_slice — only the guidelines/recommendations cited by the "
    "rubric. Use ONLY recIds that appear here. Never invent a citation.\n"
    "  • encounter_log — history questions asked, tests ordered with "
    "timestamps, treatments/prescriptions given, an explicit disposition "
    "(discharge/observe/admit-floor/admit-icu), submitted diagnosis and "
    "whether it was correct. Voice transcript may be included.\n\n"

    "Process:\n"
    "  1. For EVERY rubric criterion decide exactly one verdict: met, "
    "partially-met or missed. Match against that criterion's `evidence` field. "
    "Quote the trainee directly or name the action in your own `evidence`. "
    "Return the same criterion_id and domain as the rubric; do not add "
    "criteria and do not omit any.\n"
    "  2. For clinical_management criteria set guideline_ref to a recId from "
    "registry_slice in the form '<guideline_id>:<rec_id>'. If no listed "
    "recommendation applies, set guideline_ref to null — never fabricate.\n"
    "  3. Set safety_breach ONLY for dangerous performance: contraindicated "
    "drug, missed red-flag escalation, or no safety-netting on a high-risk "
    "diagnosis. Otherwise null. If set, the narrative MUST lead with it.\n"
    "  4. Pick 1–3 specific highlights and 1–3 priority improvements. No "
    "generic encouragement.\n"
    "  5. Write the narrative last: 1–2 paragraphs in the voice of a senior "
    "clinician giving an immediate teaching debrief. Specific, direct, no "
    "praise sandwich, no sycophancy. Do not give advice for real patients.\n\n"

    "Output schema (exact keys):\n"
    '{"criteria":[{"criterion_id":"...","domain":'
    '"data_gathering|clinical_management|interpersonal",'
    '"verdict":"met|partially-met|missed","evidence":"...",'
    '"guideline_ref":"guideline_id:rec_id|null"}],'
    '"safety_breach":{"what":"...","guideline_ref":"...|null"}|null,'
    '"highlights":["..."],"improvements":["..."],"narrative":"..."}\n\n'

    "Hard rules:\n"
    "  • Every criterion verdict must cite transcript text or a named action; "
    "'you missed ICE' is not acceptable evidence.\n"
    "  • Never reveal or grade against material absent from the rubric and "
    "registry_slice.\n"
    "  • Use encounter_log.transcript for communication evidence; quote the "
    "trainee's actual words. Do not invent dialogue.\n"
    "  • The cases are synthetic and doses simplified; grade only what the "
    "trainee did in this encounter.\n"
    "  • Never frame output as medical advice for real patients.\n"
    "  • When you name a diagnosis in human-readable text, use the Turkish "
    "label from case_summary (e.g. 'Anafilaksi'), never the raw id "
    "('anaphylaxis').\n"
    "  • Never paste internal identifiers, JSON keys or enum values into "
    "prose: write 'taburcu', 'gözlem', 'servise yatış', 'yoğun bakım' instead "
    "of 'discharge/observe/admit-floor/admit-icu', and 'kriter dg-02' only "
    "when you also say what it means in Turkish."
)

_openai_client: Optional["OpenAI"] = None
_openai_async_client: Optional["AsyncOpenAI"] = None
_openai_clients: dict[str, "OpenAI"] = {}
_openai_async_clients: dict[str, "AsyncOpenAI"] = {}


def _ensure_openai_available() -> None:
    if not _HAS_OPENAI:
        raise HTTPException(
            status_code=500,
            detail=(
                "openai package not installed. Run `pip install "
                "'openai>=1.0.0'` in the backend venv."
            ),
        )


def _require_openai_key(provider: str) -> str:
    key = _provider_key(provider)
    if not key:
        raise HTTPException(
            status_code=500,
            detail=f"{provider.upper()}_API_KEY is not set server-side (required for patient, triage and debrief).",
        )
    return key


def get_openai_client(provider: Optional[str] = None) -> "OpenAI":
    global _openai_client
    provider = (provider or LLM_PROVIDER).lower()
    if provider == LLM_PROVIDER and _openai_client is not None:
        return _openai_client
    client = _openai_clients.get(provider)
    if client is None:
        _ensure_openai_available()
        client = OpenAI(
            api_key=_require_openai_key(provider),
            base_url=_provider_base_url(provider),
        )
        _openai_clients[provider] = client
    return client


def get_async_openai_client(provider: Optional[str] = None) -> "AsyncOpenAI":
    global _openai_async_client
    provider = (provider or LLM_PROVIDER).lower()
    if provider == LLM_PROVIDER and _openai_async_client is not None:
        return _openai_async_client
    client = _openai_async_clients.get(provider)
    if client is None:
        _ensure_openai_available()
        client = AsyncOpenAI(
            api_key=_require_openai_key(provider),
            base_url=_provider_base_url(provider),
        )
        _openai_async_clients[provider] = client
    return client


# ───────────────────────────────────────────────────────────────────────────
# Credential vault — hospital EHR stub
# ───────────────────────────────────────────────────────────────────────────
#
# Credential-vault demo: a third-party system (fake hospital EHR) needs
# an auth token to query patient history. The token lives ONLY on the
# backend (EHR_API_TOKEN env var); neither the browser nor the model
# context ever sees it.
#
# Flow:
#   1. The UI (or a future agent tool) POSTs patient_id.
#   2. This endpoint attaches EHR_API_TOKEN server-side, calls the fake
#      EHR (local dict for the demo; would be an HTTP call in prod),
#      and returns the history JSON.
#   4. Browser posts the JSON back as user.custom_tool_result.
#
# Logging is intentionally token-free — the log line records that the
# vault was used and which patient was queried, but never the token
# value. A grep for the token in logs should return zero hits.

FAKE_EHR_RECORDS: dict[str, dict] = {
    "poly-001": {
        "patient_id": "poly-001",
        "name": "Mehmet Demir",
        "prior_encounters": [
            {"date": "2025-11-14", "reason": "hypertension follow-up", "bp": "148/92"},
            {"date": "2025-07-02", "reason": "annual physical", "bp": "140/88"},
        ],
        "active_medications": [
            {"name": "lisinopril", "dose": "10 mg", "frequency": "daily"},
            {"name": "atorvastatin", "dose": "20 mg", "frequency": "nightly"},
        ],
        "allergies": ["penicillin — hives"],
    },
    "poly-002": {
        "patient_id": "poly-002",
        "name": "Ayşe Kaya",
        "prior_encounters": [
            {"date": "2026-01-22", "reason": "asthma exacerbation", "peak_flow": 320},
        ],
        "active_medications": [
            {"name": "albuterol", "dose": "90 mcg", "frequency": "PRN"},
            {"name": "fluticasone", "dose": "110 mcg", "frequency": "BID"},
        ],
        "allergies": [],
    },
    "er-101": {
        "patient_id": "er-101",
        "name": "John Williams",
        "prior_encounters": [
            {"date": "2024-12-03", "reason": "STEMI, PCI to LAD"},
        ],
        "active_medications": [
            {"name": "aspirin", "dose": "81 mg", "frequency": "daily"},
            {"name": "clopidogrel", "dose": "75 mg", "frequency": "daily"},
            {"name": "metoprolol", "dose": "25 mg", "frequency": "BID"},
        ],
        "allergies": [],
    },
}


class EhrLookupRequest(BaseModel):
    patient_id: str


class EhrLookupResponse(BaseModel):
    patient_id: str
    record: dict
    fetched_via: str  # always "credential-vault"; demo label


def _vault_token_configured() -> bool:
    """Whether the EHR vault is operable. Tests can force a known value
    by setting ``EHR_API_TOKEN`` in the process environment before
    importing ``server``."""
    return bool(os.environ.get("EHR_API_TOKEN"))


@app.post("/agent/vault/ehr/lookup", response_model=EhrLookupResponse)
def vault_ehr_lookup(req: EhrLookupRequest):
    """Look up a patient's EHR record through the credential vault.

    The browser calls this in response to an
    ``agent.custom_tool_use`` for ``lookup_ehr_history``. The auth token
    is read from the server process's environment, attached to the
    downstream call (simulated here by a dict read), and the result is
    returned without the token ever appearing in the response body or
    in any log line.
    """
    patient_id = req.patient_id.strip()
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    if not _vault_token_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "EHR_API_TOKEN is not configured server-side. Set it in "
                "backend/.env.local to enable the vault."
            ),
        )
    record = FAKE_EHR_RECORDS.get(patient_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"patient_id not found: {patient_id}")
    # Token-free log line — demonstrates the vault pattern.
    _agent_log.info("vault: ehr lookup patient=%s", patient_id)
    return EhrLookupResponse(
        patient_id=patient_id,
        record=record,
        fetched_via="credential-vault",
    )


# ───────────────────────────────────────────────────────────────────────────
# Triage-reasoning endpoint (direct OpenAI-compatible inference)
# ───────────────────────────────────────────────────────────────────────────
#
# One-shot ESI triage classification called at ER arrival, before the
# debrief grader has anything to work with. Uses TRIAGE_MODEL via
# OpenRouter's free tier.
#
# Design notes:
#   • Pure function `run_triage_reasoning_openai(client, request)` so unit
#     tests can mock the OpenAI client without spinning HTTP.
#   • The system prompt inlines the 5 ESI rules we actually apply. It
#     mirrors `.claude/skills/medkit-triage-logic.md` so keep them in sync
#     when either changes.
#   • Model output is constrained to JSON via explicit instruction +
#     assistant prefill; we parse defensively and raise on malformed
#     output so the caller sees a 502 rather than silent garbage.

ESI_TRIAGE_SYSTEM_PROMPT = (
    "You classify ER arrivals on a simplified 3-level ESI scale: "
    "'critical' (ESI 1-2), 'urgent' (ESI 3), or 'stable' (ESI 4-5).\n\n"

    "Rules you apply, in priority order:\n"
    "1. RED FLAGS force 'critical' regardless of current vitals: "
    "ST elevation / new LBBB / troponin elevation; sudden focal neuro "
    "deficit within the tPA window; sustained VT / VF / torsades; "
    "anaphylaxis with airway involvement; ectopic with hemodynamic "
    "compromise; intracranial hemorrhage; qSOFA ≥ 2 of (RR≥22, altered "
    "mental status, SBP≤100).\n"
    "2. 'critical' also applies if the patient needs life-saving "
    "intervention NOW (airway, hemodynamic support, time-critical "
    "reperfusion).\n"
    "3. 'urgent' for conditions with significant morbidity but no "
    "imminent threat — appendicitis, new AFib w/ RVR, moderate asthma "
    "exacerbation, chest pain without red-flag features.\n"
    "4. 'stable' only when BOTH red flags and urgent criteria are "
    "absent AND vitals are compensated AND chief complaint is low-"
    "acuity (ankle sprain, viral URI, chronic-stable presentations).\n"
    "5. If uncertain between two levels, choose the higher severity.\n\n"

    "Write the rationale in Turkish (tr-TR).\n"
    "Respond with STRICT JSON ONLY, no prose, matching:\n"
    '{"esi_level": "critical"|"urgent"|"stable", '
    '"rationale": "<one sentence citing specific vitals or red flags>", '
    '"red_flags": [<zero or more of the rule-1 phrases that apply>]}\n'
)


class VitalsSnapshot(BaseModel):
    hr: Optional[int] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    spo2: Optional[int] = None
    rr: Optional[int] = None
    temp_c: Optional[float] = None


class TriageClassifyRequest(BaseModel):
    patient_id: str
    chief_complaint: str
    vitals: VitalsSnapshot
    ecg_findings: Optional[str] = None
    notes: Optional[str] = None


class TriageClassifyResponse(BaseModel):
    patient_id: str
    esi_level: str  # 'critical' | 'urgent' | 'stable'
    rationale: str
    red_flags: list[str]
    model: str


ALLOWED_ESI_LEVELS = {"critical", "urgent", "stable"}


def _format_triage_user_message(req: TriageClassifyRequest) -> str:
    v = req.vitals
    parts = [f"Patient {req.patient_id} — {req.chief_complaint}."]
    vitals_bits: list[str] = []
    if v.hr is not None:
        vitals_bits.append(f"HR {v.hr}")
    if v.bp_systolic is not None and v.bp_diastolic is not None:
        vitals_bits.append(f"BP {v.bp_systolic}/{v.bp_diastolic}")
    if v.spo2 is not None:
        vitals_bits.append(f"SpO2 {v.spo2}")
    if v.rr is not None:
        vitals_bits.append(f"RR {v.rr}")
    if v.temp_c is not None:
        vitals_bits.append(f"temp {v.temp_c}°C")
    if vitals_bits:
        parts.append("Vitals: " + ", ".join(vitals_bits) + ".")
    if req.ecg_findings:
        parts.append(f"ECG: {req.ecg_findings}.")
    if req.notes:
        parts.append(f"Notes: {req.notes}.")
    parts.append("Classify on the simplified ESI 3-level scale.")
    return " ".join(parts)


def run_triage_reasoning_openai(
    client: "OpenAI",
    req: TriageClassifyRequest,
    *,
    provider: Optional[str] = None,
) -> TriageClassifyResponse:
    """Classify an ER arrival through an OpenAI-compatible endpoint.

    Pure function modulo the client handle — tests pass a fake client with
    a ``chat.completions.create`` method."""
    provider = (provider or LLM_PROVIDER).lower()
    model = TASK_MODELS[provider]["triage"]
    response = client.chat.completions.create(  # type: ignore[attr-defined]
        model=model,
        max_tokens=TRIAGE_MAX_TOKENS,
        messages=[
            {"role": "system", "content": ESI_TRIAGE_SYSTEM_PROMPT},
            {"role": "user", "content": _format_triage_user_message(req)},
        ],
        **_reasoning_kwargs(provider),
    )
    raw = (response.choices[0].message.content or "").strip()
    if not raw:
        raise HTTPException(
            status_code=502,
            detail="triage model returned empty response",
        )
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        parsed = json.loads(raw)
    except ValueError as e:
        _agent_log.warning("triage: malformed JSON from model: %s", raw[:200])
        raise HTTPException(
            status_code=502,
            detail=f"triage model returned malformed JSON: {e}",
        )
    esi = str(parsed.get("esi_level", "")).strip()
    if esi not in ALLOWED_ESI_LEVELS:
        raise HTTPException(
            status_code=502,
            detail=f"triage model returned invalid esi_level: {esi!r}",
        )
    rationale = str(parsed.get("rationale", "")).strip()
    red_flags_raw = parsed.get("red_flags", [])
    red_flags = [str(x) for x in red_flags_raw] if isinstance(red_flags_raw, list) else []
    _agent_log.info(
        "triage: patient=%s esi=%s flags=%d",
        req.patient_id, esi, len(red_flags),
    )
    return TriageClassifyResponse(
        patient_id=req.patient_id,
        esi_level=esi,
        rationale=rationale,
        red_flags=red_flags,
        model=model,
    )


@app.post("/agent/triage/classify", response_model=TriageClassifyResponse)
def triage_classify(req: TriageClassifyRequest):
    """Nemotron ile ESI sınıflandırması (NVIDIA birincil, OpenRouter yedek)."""
    last_error: Optional[HTTPException] = None
    for provider in provider_order():
        try:
            client = get_openai_client(provider)
            return run_triage_reasoning_openai(client, req, provider=provider)
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            last_error = exc
            _agent_log.warning("triage provider=%s failed: %s", provider, exc.detail)
    _agent_log.error("triage failed on every provider: %s", last_error)
    raise HTTPException(
        status_code=502,
        detail="Triyaj servisi şu an yanıt veremiyor; birkaç dakika sonra tekrar deneyin.",
    )


# ───────────────────────────────────────────────────────────────────────────
# Debrief grading (free OpenRouter model, single structured call)
# ───────────────────────────────────────────────────────────────────────────
#
# Replaces the paid Anthropic Managed Agent. The browser posts the rubric,
# the guideline slice and the encounter log; the model returns per-criterion
# verdicts plus a narrative. Domain scores and the global rating are computed
# HERE from the rubric weights so a model arithmetic slip cannot change the
# grade.

GRADE_BANDS = (
    (0.85, "excellent"),
    (0.70, "good"),
    (0.55, "satisfactory"),
    (0.40, "borderline"),
)
DEBRIEF_MAX_TOKENS = int(os.environ.get("DEBRIEF_MAX_TOKENS", "2500"))
DEBRIEF_TIMEOUT_SEC = float(os.environ.get("DEBRIEF_TIMEOUT_SEC", "90"))
ALLOWED_VERDICTS = {"met", "partially-met", "missed"}
DOMAINS = ("data_gathering", "clinical_management", "interpersonal")


class DebriefRequest(BaseModel):
    case_id: str
    case_summary: dict = {}
    rubric: dict
    registry_slice: list[dict] = []
    encounter_log: dict = {}


class DebriefResponse(BaseModel):
    evaluation: dict
    model: str


def _band(ratio: float) -> str:
    for floor, label in GRADE_BANDS:
        if ratio >= floor:
            return label
    return "clear-fail"


def _rubric_weights(rubric: dict) -> dict[str, tuple[str, float]]:
    out: dict[str, tuple[str, float]] = {}
    for domain in DOMAINS:
        for cr in rubric.get(domain, []) or []:
            cid = str(cr.get("criterion_id", "")).strip()
            if not cid:
                continue
            try:
                weight = float(cr.get("weight", 1))
            except (TypeError, ValueError):
                weight = 1.0
            out[cid] = (domain, weight)
    return out


def _allowed_refs(registry_slice: list[dict]) -> set[str]:
    refs: set[str] = set()
    for g in registry_slice:
        gid = str(g.get("id", "")).strip()
        for rec in g.get("recommendations", []) or []:
            rid = str(rec.get("recId", "")).strip()
            if gid and rid:
                refs.add(f"{gid}:{rid}")
    return refs


def _strip_json(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start >= 0 and end > start:
        raw = raw[start : end + 1]
    return raw


def _salvage_truncated_json(raw: str) -> Optional[dict]:
    """Keep complete criteria objects when the model stops mid-JSON.

    Missing criteria are scored as missed downstream, so a truncated response
    still produces a usable debrief instead of a hard 502.
    """
    anchor = raw.find('"criteria"')
    arr_start = raw.find("[", anchor) if anchor >= 0 else -1
    if arr_start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    last_item_end = -1
    for i in range(arr_start, len(raw)):
        ch = raw[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
            if ch == "}" and depth == 1:
                last_item_end = i + 1
            if depth == 0:
                return None
    if last_item_end < 0:
        return None
    candidate = raw[:last_item_end].rstrip().rstrip(",") + "]}"
    try:
        parsed = json.loads(candidate)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _debrief_completion(
    client: "OpenAI",
    messages: list[dict],
    *,
    json_mode: bool,
    provider: str,
):
    kwargs = {
        "model": TASK_MODELS[provider]["grader"],
        "max_tokens": DEBRIEF_MAX_TOKENS,
        "temperature": 0.2,
        "timeout": DEBRIEF_TIMEOUT_SEC,
        "messages": messages,
        # Some free models spend the entire token budget on hidden reasoning
        # and return empty content. Grading does not need chain-of-thought.
        **_reasoning_kwargs(provider),
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    return client.chat.completions.create(**kwargs)  # type: ignore[attr-defined]


# Free models occasionally ignore the Turkish instruction in the system
# prompt and answer in English. These helpers detect that and force a retry,
# with a one-shot translation pass as the last resort — the UI must never
# show English debrief text.
_TURKISH_CHARS = "çğıöşüÇĞİÖŞÜ"
_EN_STOPWORDS = frozenset({
    "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
    "these", "those", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "not", "no", "only", "also",
    "with", "without", "from", "into", "during", "after", "before", "between",
    "about", "for", "of", "to", "in", "on", "at", "by", "as", "when", "which",
    "while", "their", "they", "them", "there", "here", "you", "your", "we",
    "our", "it", "its", "he", "she", "his", "her", "trainee", "patient",
    "asked", "recorded", "observed",
})
# Content words that never appear in Turkish prose but do appear in English
# grading feedback. One of them is already a strong signal.
_EN_CONTENT_WORDS = frozenset({
    "diagnosis", "diagnoses", "correct", "incorrect", "treatment", "treated",
    "administered", "confirmed", "missed", "performed", "documented",
    "history", "management", "empathic", "response", "critical", "action",
    "structured", "introduction", "agenda", "summary", "safety", "netting",
    "discharge", "admit", "prescription", "dose", "duration", "vitals",
    "examination", "follow", "up", "plan", "greeted", "elicited", "stated",
})

DEBRIEF_TURKISH_CORRECTION = (
    "ÖNEMLİ DÜZELTME: Önceki yanıtında İngilizce metinler vardı. evidence, "
    "safety_breach.what, highlights, improvements ve narrative alanlarının "
    "TAMAMI Türkçe (tr-TR) olmak zorunda. 'Trainee asked …', 'The trainee …', "
    "'No … was observed' gibi İngilizce cümleler kullanma; Türkçe yaz. "
    "JSON anahtarları, enum değerleri ve guideline_ref aynı kalsın. "
    "Yalnızca JSON döndür."
)

_DEBRIEF_TRANSLATE_PROMPT = (
    "Sen Türkçe tıbbi çeviri uzmanısın. Sana verilen JSON'daki 'strings' "
    "dizisindeki her metni doğal, akıcı Türkçeye (tr-TR) çevir. Tıbbi terimleri "
    "Türkçe klinik karşılıklarıyla yaz; ilaç adları, ölçü birimleri ve "
    "kısaltmalar (EKG, IM, ICE, SEGUE) aynı kalsın. Dizinin sırasını ve "
    "uzunluğunu koru. Yalnızca {\"translations\": [\"...\"]} biçiminde JSON "
    "döndür."
)


def _looks_english(text: str) -> bool:
    """Heuristic: English function/content-word density without Turkish chars."""
    if not text or len(text) < 8:
        return False
    if any(ch in _TURKISH_CHARS for ch in text):
        return False
    words = re.findall(r"[A-Za-z][A-Za-z'\-]*", text)
    if len(words) < 4:
        return False
    lowered = [w.lower() for w in words]
    stop_hits = sum(1 for w in lowered if w in _EN_STOPWORDS)
    content_hits = sum(1 for w in lowered if w in _EN_CONTENT_WORDS)
    hits = stop_hits + content_hits
    if hits >= 2 and hits / len(words) >= 0.12:
        return True
    # A single unmistakable English content word in a longer sentence is
    # enough — e.g. "Diagnosis was correct (anaphylaxis)." (one stopword,
    # two content words, but still English).
    return content_hits >= 1 and len(words) >= 5


def _iter_evaluation_strings(parsed: dict):
    for item in parsed.get("criteria", []) or []:
        if isinstance(item, dict):
            ev = item.get("evidence")
            if isinstance(ev, str) and ev.strip():
                yield ev
    safety = parsed.get("safety_breach")
    if isinstance(safety, dict):
        what = safety.get("what")
        if isinstance(what, str) and what.strip():
            yield what
    for key in ("highlights", "improvements"):
        values = parsed.get(key)
        if isinstance(values, list):
            for value in values:
                if isinstance(value, str) and value.strip():
                    yield value
    narrative = parsed.get("narrative")
    if isinstance(narrative, str) and narrative.strip():
        yield narrative


def _evaluation_has_english(parsed: dict) -> bool:
    return any(_looks_english(text) for text in _iter_evaluation_strings(parsed))


def _apply_evaluation_translations(parsed: dict, translations: list) -> None:
    index = 0

    def take(original: str) -> str:
        nonlocal index
        value = translations[index] if index < len(translations) else None
        index += 1
        return value.strip() if isinstance(value, str) and value.strip() else original

    for item in parsed.get("criteria", []) or []:
        if isinstance(item, dict) and isinstance(item.get("evidence"), str):
            item["evidence"] = take(item["evidence"])
    safety = parsed.get("safety_breach")
    if isinstance(safety, dict) and isinstance(safety.get("what"), str):
        safety["what"] = take(safety["what"])
    for key in ("highlights", "improvements"):
        values = parsed.get(key)
        if isinstance(values, list):
            parsed[key] = [
                take(value) if isinstance(value, str) else value for value in values
            ]
    if isinstance(parsed.get("narrative"), str):
        parsed["narrative"] = take(parsed["narrative"])


def _translate_evaluation_strings(
    client: "OpenAI", provider: str, parsed: dict
) -> bool:
    """Translate every human-readable debrief string to Turkish in one call."""
    texts = list(_iter_evaluation_strings(parsed))
    if not texts:
        return False
    try:
        response = client.chat.completions.create(  # type: ignore[attr-defined]
            model=TASK_MODELS[provider]["grader"],
            max_tokens=min(DEBRIEF_MAX_TOKENS, 2000),
            temperature=0,
            timeout=DEBRIEF_TIMEOUT_SEC,
            messages=[
                {"role": "system", "content": _DEBRIEF_TRANSLATE_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps({"strings": texts}, ensure_ascii=False),
                },
            ],
            response_format={"type": "json_object"},
            **_reasoning_kwargs(provider),
        )
        raw = (response.choices[0].message.content or "").strip()
        data = json.loads(_strip_json(raw))
    except Exception as e:
        _agent_log.warning("debrief translation fallback failed: %s", e)
        return False
    translations = data.get("translations") if isinstance(data, dict) else None
    if not isinstance(translations, list) or len(translations) != len(texts):
        _agent_log.warning("debrief translation fallback: unexpected shape")
        return False
    _apply_evaluation_translations(parsed, translations)
    return True


def run_debrief_evaluation_openai(
    client: "OpenAI",
    req: DebriefRequest,
    *,
    provider: Optional[str] = None,
) -> DebriefResponse:
    """Grade one encounter through an OpenAI-compatible free model."""
    provider = (provider or LLM_PROVIDER).lower()
    model = TASK_MODELS[provider]["grader"]
    weights = _rubric_weights(req.rubric)
    if not weights:
        raise HTTPException(status_code=400, detail="Değerlendirme rubriğinde kriter yok.")
    user_payload = json.dumps(req.model_dump(), ensure_ascii=False)
    messages = [
        {"role": "system", "content": DEBRIEF_SYSTEM_PROMPT},
        {"role": "user", "content": user_payload},
    ]
    parsed: Optional[dict] = None
    last_error = ""
    language_nudge = False
    for attempt in range(1, 4):
        json_mode = attempt == 1
        attempt_messages = messages
        if language_nudge:
            attempt_messages = messages + [
                {"role": "user", "content": DEBRIEF_TURKISH_CORRECTION}
            ]
        try:
            response = _debrief_completion(
                client, attempt_messages, json_mode=json_mode, provider=provider
            )
        except Exception as e:  # provider/model may reject response_format
            last_error = f"istek başarısız: {e}"
            _agent_log.warning("debrief attempt %d: %s", attempt, last_error)
            continue
        choice = response.choices[0]
        raw = (choice.message.content or "").strip()
        _agent_log.info(
            "debrief attempt %d: model=%s finish=%s chars=%d",
            attempt, getattr(response, "model", model),
            getattr(choice, "finish_reason", "?"), len(raw),
        )
        if not raw:
            last_error = "boş yanıt"
            continue
        try:
            candidate = json.loads(_strip_json(raw))
        except ValueError:
            candidate = _salvage_truncated_json(_strip_json(raw))
            if candidate is not None:
                _agent_log.warning("debrief: salvaged truncated JSON (%d chars)", len(raw))
        if isinstance(candidate, dict):
            if _evaluation_has_english(candidate) and not language_nudge:
                last_error = "yanıt Türkçe değil"
                language_nudge = True
                _agent_log.warning(
                    "debrief attempt %d: English output detected, retrying in Turkish",
                    attempt,
                )
                continue
            parsed = candidate
            break
        last_error = "geçersiz JSON"
        _agent_log.warning("debrief attempt %d malformed JSON: %r", attempt, raw[:240])
    if parsed is None:
        raise HTTPException(
            status_code=502,
            detail=f"Değerlendirme modeli geçerli JSON üretemedi ({last_error}).",
        )

    # Last resort: if the retry still came back in English, translate the
    # human-readable fields in one extra call rather than showing English.
    if _evaluation_has_english(parsed):
        _agent_log.warning("debrief: still not Turkish after retry, translating")
        _translate_evaluation_strings(client, provider, parsed)

    allowed_refs = _allowed_refs(req.registry_slice)

    by_id: dict[str, dict] = {}
    for item in parsed.get("criteria", []) or []:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("criterion_id", "")).strip()
        if cid not in weights:
            continue
        verdict = str(item.get("verdict", "")).strip().lower().replace("_", "-")
        if verdict not in ALLOWED_VERDICTS:
            verdict = "missed"
        evidence = str(item.get("evidence", "")).strip()
        if not evidence:
            evidence = "Değerlendirme çıktısında bu kriter için kanıt yok."
        ref = item.get("guideline_ref")
        ref = str(ref).strip() if ref else None
        if ref not in allowed_refs:
            ref = None
        by_id[cid] = {
            "criterion_id": cid,
            "domain": weights[cid][0],
            "verdict": verdict,
            "evidence": evidence,
            "guideline_ref": ref,
        }

    criteria: list[dict] = []
    for cid, (domain, _weight) in weights.items():
        if cid in by_id:
            criteria.append(by_id[cid])
        else:
            criteria.append(
                {
                    "criterion_id": cid,
                    "domain": domain,
                    "verdict": "missed",
                    "evidence": "Değerlendirme çıktısında bu kriter ele alınmamış.",
                    "guideline_ref": None,
                }
            )

    domain_scores: dict[str, dict] = {}
    total_raw = 0.0
    total_max = 0.0
    for domain in DOMAINS:
        raw_score = 0.0
        max_score = 0.0
        for cid, (d, weight) in weights.items():
            if d != domain:
                continue
            max_score += weight
            verdict = by_id.get(cid, {}).get("verdict", "missed")
            raw_score += weight * (1.0 if verdict == "met" else 0.5 if verdict == "partially-met" else 0.0)
        total_raw += raw_score
        total_max += max_score
        domain_scores[domain] = {
            "raw": round(raw_score, 2),
            "max": round(max_score, 2),
            "verdict": _band(raw_score / max_score) if max_score else "clear-fail",
        }

    safety = parsed.get("safety_breach")
    if isinstance(safety, dict) and str(safety.get("what", "")).strip():
        sref = safety.get("guideline_ref")
        sref = str(sref).strip() if sref else None
        if sref not in allowed_refs:
            sref = None
        safety_breach = {"what": str(safety["what"]).strip(), "guideline_ref": sref}
    else:
        safety_breach = None

    def _string_list(value: object, limit: int) -> list[str]:
        if not isinstance(value, list):
            return []
        out = [str(x).strip() for x in value if str(x).strip()]
        return out[:limit]

    highlights = _string_list(parsed.get("highlights"), 3)
    improvements = _string_list(parsed.get("improvements"), 3)
    narrative = str(parsed.get("narrative", "")).strip()
    if not narrative:
        narrative = "Değerlendirme tamamlandı; ayrıntılar kriter bazında listelenmiştir."
    if not highlights:
        highlights = ["Belirgin bir güçlü yön kaydedilmedi."]
    if not improvements:
        improvements = ["Değerlendirme için yeterli kayıt yok; öykü ve gerekçeyi daha açık belirtin."]

    evaluation = {
        "case_id": req.case_id,
        "global_rating": _band(total_raw / total_max) if total_max else "clear-fail",
        "domain_scores": domain_scores,
        "criteria": criteria,
        "safety_breach": safety_breach,
        "highlights": highlights,
        "improvements": improvements,
        "narrative": narrative,
    }
    _agent_log.info(
        "debrief: case=%s criteria=%d global=%s",
        req.case_id, len(criteria), evaluation["global_rating"],
    )
    return DebriefResponse(evaluation=evaluation, model=model)


@app.post("/agent/debrief", response_model=DebriefResponse)
def debrief(req: DebriefRequest):
    """OSCE değerlendirmesi — ücretsiz model, tek çağrı; sağlayıcı yedeği var."""
    last_error: Optional[HTTPException] = None
    for provider in provider_order():
        try:
            client = get_openai_client(provider)
            return run_debrief_evaluation_openai(client, req, provider=provider)
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            last_error = exc
            _agent_log.warning("debrief provider=%s failed: %s", provider, exc.detail)
    _agent_log.error("debrief failed on every provider: %s", last_error)
    raise HTTPException(
        status_code=502,
        detail="Değerlendirme servisi şu an yanıt veremiyor; birkaç dakika sonra tekrar deneyin.",
    )


# ───────────────────────────────────────────────────────────────────────────
# Patient persona streaming — Nemotron via OpenRouter
# ───────────────────────────────────────────────────────────────────────────
#
# The browser never sees an LLM key: it streams through this backend, which
# attaches OPENROUTER_API_KEY server-side. SSE frames carry `{"text": "..."}`
# deltas, terminated with `{"done": true}`. Patient replies are short
# (max 256 tokens) so we skip the keepalive logic the long-lived agent
# stream needs.

PATIENT_MODEL = TASK_MODELS[LLM_PROVIDER]["patient"]
PATIENT_MAX_TOKENS = 256


class PatientChatMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class PatientStreamRequest(BaseModel):
    system: str
    messages: list[PatientChatMessage]


@app.post("/agent/patient/stream")
async def patient_stream(req: PatientStreamRequest):
    async def generator():
        last_error: Exception | None = None
        for provider in provider_order():
            yielded = False
            try:
                client = get_async_openai_client(provider)
                stream = await client.chat.completions.create(  # type: ignore[attr-defined]
                    model=TASK_MODELS[provider]["patient"],
                    max_tokens=PATIENT_MAX_TOKENS,
                    messages=[
                        {"role": "system", "content": req.system},
                    ] + [
                        {"role": m.role, "content": m.content} for m in req.messages
                    ],
                    stream=True,
                    **_reasoning_kwargs(provider),
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yielded = True
                        yield "data: " + json.dumps({"text": delta.content}) + "\n\n"
                yield "data: " + json.dumps({"done": True}) + "\n\n"
                return
            except asyncio.CancelledError:
                raise
            except Exception as e:
                last_error = e
                if yielded:
                    _agent_log.exception("patient stream failed mid-response")
                    yield "data: " + json.dumps({"error": str(e)}) + "\n\n"
                    return
                _agent_log.warning("patient provider=%s failed: %s", provider, e)
        _agent_log.error("patient stream failed on every provider: %s", last_error)
        yield "data: " + json.dumps({"error": str(last_error)}) + "\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ───────────────────────────────────────────────────────────────────────────
# Real-time voice — LiveKit access tokens
# ───────────────────────────────────────────────────────────────────────────
#
# The frontend posts the persona payload here. We create the LiveKit room
# with that payload as room metadata (so the voice agent worker can read it
# at room-join time) and return a JWT the browser uses to connect.
#
# Persona prompt and initial line are produced by `src/voice/patientPersona.ts`
# in TS — Python doesn't duplicate the logic, it just relays.

import json as _json
import secrets as _secrets
import asyncio as _asyncio

from livekit import api as _lkapi


class VoiceTokenRequest(BaseModel):
    caseId: str
    systemPrompt: str
    initialLine: str
    gender: str  # 'M' | 'F' — speaker gender (parent for pediatric)
    sttPrompt: Optional[str] = None  # Turkish clinical vocabulary bias
    voiceId: Optional[str] = None  # explicit override
    identity: Optional[str] = None  # browser-side participant identity


class VoiceTokenResponse(BaseModel):
    token: str
    url: str
    roomName: str


@app.post("/voice/token", response_model=VoiceTokenResponse)
async def voice_token(req: VoiceTokenRequest):
    lk_url = os.environ.get("LIVEKIT_URL")
    lk_key = os.environ.get("LIVEKIT_API_KEY")
    lk_secret = os.environ.get("LIVEKIT_API_SECRET")
    if not (lk_url and lk_key and lk_secret):
        raise HTTPException(
            status_code=500,
            detail="LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET not configured",
        )

    nonce = _secrets.token_urlsafe(8)
    safe_case = "".join(c for c in req.caseId if c.isalnum() or c in "-_")[:32] or "case"
    room_name = f"gr-{safe_case}-{nonce}"
    identity = req.identity or f"doctor-{_secrets.token_hex(4)}"

    metadata = _json.dumps(
        {
            "caseId": req.caseId,
            "systemPrompt": req.systemPrompt,
            "initialLine": req.initialLine,
            "sttPrompt": req.sttPrompt,
            "voiceGender": req.gender,
            "voiceId": req.voiceId,
        }
    )

    # Pre-create the room so metadata is set before the agent dispatches in.
    # `agents=[RoomAgentDispatch(agent_name="medkit-voice")]` makes dispatch
    # explicit by name instead of relying on LiveKit's automatic region/cluster
    # matching, which fails when the room-creator (Render Oregon) and the
    # worker (registered in EU/Germany 2) are in different clouds.
    # Local dev servers expose Twirp over http:// while the browser client
    # needs ws://. Allow overriding the admin URL separately.
    lk_api_url = os.environ.get("LIVEKIT_API_URL") or (
        lk_url.replace("wss://", "https://", 1).replace("ws://", "http://", 1)
    )
    lkapi = _lkapi.LiveKitAPI(lk_api_url, lk_key, lk_secret)
    try:
        await lkapi.room.create_room(
            _lkapi.CreateRoomRequest(
                name=room_name,
                metadata=metadata,
                empty_timeout=120,
                agents=[_lkapi.RoomAgentDispatch(agent_name="medkit-voice")],
            )
        )
    except Exception as e:
        # If the room already exists (rare race), let it through.
        msg = str(e).lower()
        if "already" not in msg and "exists" not in msg:
            await lkapi.aclose()
            raise HTTPException(status_code=502, detail=f"livekit room create failed: {e}")
    finally:
        try:
            await lkapi.aclose()
        except Exception:
            pass

    token = (
        _lkapi.AccessToken(lk_key, lk_secret)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(
            _lkapi.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .to_jwt()
    )

    return VoiceTokenResponse(token=token, url=lk_url, roomName=room_name)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8787, log_level="info")
