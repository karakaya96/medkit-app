# medkit

Browser-based ER + polyclinic clinical training simulator. You play the doctor: new patients arrive at triage, you talk to them in real time, order tests, treat, disposition. An attending physician (Claude Opus 4.7) watches and grades your decisions.

> Hackathon submission. Cases are plausible but synthetic — no clinical claims.

---

## About

Medkit is a voice-first AI patient simulator for medical students and newly graduated doctors. You take the history, order labs, read imaging, diagnose, and prescribe — talking to AI patients in real time. After each session, an attending grader powered by Claude Opus 4.7 marks your communication, history-taking, and clinical reasoning, citing published guidelines (NICE, ESC, AHA, GINA, GOLD) from a curated registry so the grading can't fabricate sources.

The format is modelled on OSCE training with standardised patients, which works well but is expensive, scheduled rarely, requires physical attendance, and isn't available in many countries — leaving most trainees globally with little or no access. Medkit makes the same kind of practice available on demand in the browser.

Built in three days for the Opus 4.7 hackathon by a medical-doctor-turned-software-engineer ([@bedriyan](https://github.com/bedriyan)), using Claude Code with Opus 4.7.

---

## What's inside

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite, Three.js (`@react-three/fiber`, `@react-three/drei`) |
| Voice transport | LiveKit Cloud (WebRTC) via `livekit-client` |
| Voice worker | Python `livekit-agents` — faster-whisper STT → Nemotron via OpenRouter (NVIDIA fallback) → edge-tts (Turkish voices) |
| HTTP backend | FastAPI on `127.0.0.1:8787` — Managed Agents proxy + OpenRouter patient/triage paths + LiveKit JWT mint |
| Attending grader | Claude **Opus 4.7** as a Managed Agent (`medkit-attending`) |
| Triage classifier | Nemotron on OpenRouter (OpenAI-compatible), configurable via `TRIAGE_MODEL` |
| State | Single `Store` class with `useSyncExternalStore` (no Redux/Zustand) |

Two flows:
- **ER** — multiple beds, real-time voice with each patient, tests resolve over simulated minutes.
- **Polyclinic** — one outpatient at a time, tests resolve instantly.

---

## Prerequisites

- **Node.js 22+** (TS files are run natively via type-stripping)
- **Python 3.11+**
- **ffmpeg** on `PATH` (edge-tts MP3 → 16 kHz PCM conversion)
- A modern browser with mic permission (Chrome/Edge recommended for WebRTC)

---

## API keys you'll need

All keys are server-side only — the browser never sees them. Get one of each:

| Service | What it does | Where to get it | Free tier? |
|---|---|---|---|
| **Anthropic** | Powers the attending grader (`medkit-attending` Managed Agent, Opus 4.7) | https://console.anthropic.com → API Keys | Pay-as-you-go, no free tier |
| **OpenRouter** | Patient persona + triage + voice-worker LLM (Nemotron) | https://openrouter.ai → Keys | Yes — free models available |
| **NVIDIA** (optional) | Fallback LLM provider for the voice worker (`LLM_PROVIDER=nvidia`) | https://build.nvidia.com → API Keys | Yes — free credits |
| **LiveKit Cloud** | Real-time WebRTC transport between browser ↔ voice worker | https://cloud.livekit.io → create project → Settings → Keys (gives `URL`, `API Key`, `API Secret`) | Yes — generous free tier |

STT (faster-whisper) and TTS (edge-tts) run locally — no STT/TTS API key is needed, but **ffmpeg** must be installed for TTS decoding.

---

## Setup

### 1. Frontend

```bash
npm install
```

### 2. Backend (two separate venvs)

The FastAPI server and the LiveKit voice worker have very different dependency trees, so they each get their own venv.

```bash
cd backend

# FastAPI server — FastAPI + Anthropic + OpenAI-compatible client + livekit-api
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt

# Voice worker — livekit-agents + faster-whisper + edge-tts
python -m venv .venv-voice
.venv-voice/bin/python -m pip install -r voice_agent_requirements.txt
```

> On Windows replace `.venv/bin/python` with `.venv/Scripts/python`.

### 3. Configure secrets

```bash
cp backend/.env.example backend/.env.local
```

Fill in `backend/.env.local`:

```env
# Managed Agent grading (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# Patient persona + triage + voice LLM
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
# Optional fallback for the voice worker:
NVIDIA_API_KEY=
LLM_PROVIDER=openrouter

# Patient/triage model IDs (OpenAI-compatible)
PATIENT_MODEL=nvidia/nemotron-3-ultra:free
TRIAGE_MODEL=nvidia/nemotron-3-ultra:free

# Local voice stack
WHISPER_MODEL=base

# LiveKit Cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxx
LIVEKIT_API_SECRET=...

# Backend protection (Vercel edge → Render)
BACKEND_SHARED_SECRET=

# Credential vault demo
EHR_API_TOKEN=

# Leave these blank on first run — see "Bootstrap the Managed Agent" below
MEDKIT_AGENT_ID=
MEDKIT_ENV_ID=
```

### 4. Bootstrap the Managed Agent (one-time)

Start the FastAPI server, then create the persistent attending agent:

```bash
backend/.venv/bin/python backend/server.py
# In another terminal:
curl -X POST http://127.0.0.1:8787/agent/bootstrap
```

The response contains an `agent_id` and `environment_id`. Paste them back into `backend/.env.local` as `MEDKIT_AGENT_ID` / `MEDKIT_ENV_ID` and **restart the server**. Subsequent runs are no-ops.

---

## Run (three terminals)

```bash
# Terminal 1 — frontend
npm run dev
# Vite serves http://localhost:5173

# Terminal 2 — FastAPI backend
backend/.venv/bin/python backend/server.py
# Listens on http://127.0.0.1:8787 (proxied by Vite at /agent/* and /voice/*)

# Terminal 3 — LiveKit voice worker
backend/.venv-voice/bin/python backend/voice_agent.py dev
# Logs "registered worker" once connected to LiveKit Cloud
```

All three must be up for voice. The frontend works without the worker — you'll just lose real-time voice (text chat still works).

Open http://localhost:5173 and grant microphone permission when prompted.

---

## Useful scripts

```bash
npm run build      # tsc + vite build
npm run preview    # preview production build
npm run verify     # deterministic invariants over src/data/* — run after editing cases/tests/treatments
npm run test       # custom-tools + loop-commands tests
```

---

## Project layout

```
src/
  game/               # Store, types, single source of truth
  data/               # Patients, tests, treatments, medications, guidelines (pure data)
  components/         # React UI
  components/three/   # Three.js scenes (ER room, polyclinic)
  voice/              # LiveKit conversation + persona builders
  agents/             # Managed Agent client + custom-tool UI renderer
backend/
  server.py           # FastAPI: Managed Agents proxy + /voice/token
  voice_agent.py      # LiveKit Agents worker (faster-whisper → Nemotron → edge-tts)
.claude/skills/       # Authoring skills (patient generator, rubric author, guideline curator, ...)
scripts/verify/       # Deterministic data-integrity checks
```

---

## Model routing

| Call | Model | Why |
|---|---|---|
| Patient voice persona | Nemotron via OpenRouter (`PATIENT_MODEL`) | Fast and free; good enough for in-character reply |
| Triage classifier | Nemotron via OpenRouter (`TRIAGE_MODEL`) | One-shot ESI classification; overridable |
| `medkit-attending` grading | **Claude Opus 4.7** | Clinical reasoning, precision matters |

---

## Notes

- **Group policy on Windows:** scripts call `node node_modules/<pkg>/bin/<entry>.js` instead of the `.bin` shims because some corporate machines block `.exe` wrappers under `node_modules/`. Keep this pattern when adding new scripts.
- **Local voice stack:** faster-whisper downloads its model on first use and runs on CPU; `WHISPER_MODEL=base` is the default. edge-tts needs `ffmpeg` on `PATH`.
- **Free-tier LLM routing:** the patient/triage/voice paths use OpenRouter's OpenAI-compatible API. Swap `PATIENT_MODEL` / `TRIAGE_MODEL` / `LLM_PROVIDER` in `.env.local` without code changes.
- **Out of scope:** multi-agent handoffs, persistent user accounts, anything claiming clinical accuracy.

---

## License

Public for review. No open-source license is granted — do not redistribute without permission from the author.
