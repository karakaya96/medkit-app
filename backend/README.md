# medkit backend

Two Python processes power the simulator:

1. **FastAPI server** (`server.py`) — Managed Agents proxy (`/agent/*`), OpenRouter patient-text-chat SSE (`/agent/patient/stream`), one-shot ESI triage (`/agent/triage/classify`), and the LiveKit token mint (`/voice/token`). Lives at `127.0.0.1:8787`.
2. **LiveKit voice worker** (`voice_agent.py`) — joins every room created by `/voice/token`, runs local faster-whisper STT → Nemotron via OpenRouter (NVIDIA fallback) → local edge-tts TTS over WebRTC.

Both must be running for real-time voice to work. `ffmpeg` must be on `PATH`.

## Install

The two processes use **separate venvs** so the worker's deps don't tangle with the FastAPI server's.

```bash
cd backend

# Server venv — FastAPI + Anthropic (Managed Agent) + OpenAI-compatible client.
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt

# Voice worker venv — livekit-agents + faster-whisper + edge-tts.
python -m venv .venv-voice
.venv-voice/bin/python -m pip install -r voice_agent_requirements.txt
```

> On Windows use `.venv/Scripts/python.exe` and `.venv-voice/Scripts/python.exe`.

## Configure

Copy `.env.example` to `.env.local` and fill in:

- `ANTHROPIC_API_KEY` — `medkit-attending` Managed Agent (Opus 4.7).
- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` — patient persona, triage, and voice-worker LLM.
- `NVIDIA_API_KEY` — optional voice-worker fallback (`LLM_PROVIDER=nvidia`).
- `PATIENT_MODEL`, `TRIAGE_MODEL`, `LLM_PROVIDER` — model routing without code changes.
- `WHISPER_MODEL` — faster-whisper size (default `base`).
- `BACKEND_SHARED_SECRET` — non-loopback clients must send `x-medkit-auth`; if empty, only loopback clients are accepted.
- `EHR_API_TOKEN` — credential-vault demo token.
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — from LiveKit Cloud.
- `MEDKIT_AGENT_ID`, `MEDKIT_ENV_ID` — leave blank on first run, paste back from `/agent/bootstrap`.

## Run

```bash
# Terminal 1 — FastAPI
.venv/bin/python server.py

# Terminal 2 — voice worker
.venv-voice/bin/python voice_agent.py dev
```

The worker logs `registered worker` once it's connected to LiveKit Cloud. From then on, any room created via `POST /voice/token` will dispatch a worker into it; the worker reads the persona payload from room metadata and starts the patient.

## Tests

```bash
.venv/bin/python -m unittest discover tests
```

`tests/test_vault.py` covers the credential vault + auth gate; `tests/test_triage.py` covers the ESI classifier and mocks the OpenAI client.

## Endpoints

- `GET  /health` — public; backend + agent + voice config status (no agent/environment IDs).
- `POST /voice/token` — body `{caseId, systemPrompt, initialLine, gender}`. Pre-creates a LiveKit room with the persona payload as metadata, returns `{token, url, roomName}`.
- `POST /agent/*` — Managed Agents proxy for the medkit-attending. See inline docs in `server.py`.
- `POST /agent/patient/stream` — text-only patient persona SSE; used by the right-sidebar text chat.
- `POST /agent/triage/classify` — one-shot ESI classification via `TRIAGE_MODEL`.

All `/agent/*` and `/voice/*` routes require `x-medkit-auth: $BACKEND_SHARED_SECRET` unless the TCP peer is loopback. Client-supplied `Origin`/`Referer` headers are never trusted.
