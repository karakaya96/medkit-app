# medkit

Browser-based ER + polyclinic clinical training simulator. You play the doctor: new patients arrive at triage, you talk to them in real time, order tests, treat, disposition. A free-tier attending grader reviews your decisions after the encounter.

> Hackathon submission. Cases are plausible but synthetic — no clinical claims.

---

## About

Medkit is a voice-first AI patient simulator for medical students and newly graduated doctors. You take the history, order labs, read imaging, diagnose, and prescribe — talking to AI patients in real time. After each session, an attending grader running on an OpenRouter free model marks your communication, history-taking, and clinical reasoning, citing published guidelines (NICE, ESC, AHA, GINA, GOLD) from a curated registry so the grading can't fabricate sources.

The format is modelled on OSCE training with standardised patients, which works well but is expensive, scheduled rarely, requires physical attendance, and isn't available in many countries — leaving most trainees globally with little or no access. Medkit makes the same kind of practice available on demand in the browser.

Built in three days for the Opus 4.7 hackathon by a medical-doctor-turned-software-engineer ([@bedriyan](https://github.com/bedriyan)), using Claude Code with Opus 4.7.

---

## What's inside

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite, Three.js (`@react-three/fiber`, `@react-three/drei`) |
| Voice transport | LiveKit (Cloud free tier or local dev server) via `livekit-client` |
| Voice worker | Python `livekit-agents` — faster-whisper STT → Nemotron via OpenRouter (NVIDIA fallback) → edge-tts (Turkish voices) |
| HTTP backend | FastAPI on `127.0.0.1:8787` — OpenRouter debrief/patient/triage paths + LiveKit JWT mint |
| Attending grader | OpenRouter free model, single structured call (`/agent/debrief`) |
| Triage classifier | OpenRouter free model (OpenAI-compatible), configurable via `TRIAGE_MODEL` |
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
| **OpenRouter** | Patient persona, ESI triage and debrief grading | https://openrouter.ai → Keys | Yes — `:free` models, 20 req/min, 50/day |
| **NVIDIA** (optional) | Fallback LLM provider for the voice worker (`LLM_PROVIDER=nvidia`) | https://build.nvidia.com → API Keys | Yes — free credits |
| **LiveKit** | Real-time WebRTC transport between browser ↔ voice worker | Cloud: https://cloud.livekit.io → project → Settings → Keys. **Or local, no account:** `livekit-server --dev` | Yes |

No Anthropic or paid API is required. If you stay entirely on the free tier, set
`OPENROUTER_API_KEY` and the three `LIVEKIT_*` values. OpenRouter's free models
are rate-limited (about 20 requests/minute and 50 requests/day without credits);
a one-time $10 credit raises the daily cap to ~1,000 but is not required for a
demo. Pin `GRADER_MODEL` if you want reproducible grading instead of the
`openrouter/free` router.

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

# FastAPI server — FastAPI + OpenAI-compatible client + livekit-api
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
# Free-tier LLM path (patient, triage, debrief)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
FREE_MODEL=openrouter/free
PATIENT_MODEL=openrouter/free
TRIAGE_MODEL=openrouter/free
GRADER_MODEL=openrouter/free

# Optional fallback for the voice worker:
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning
LLM_PROVIDER=openrouter

# Local voice stack
WHISPER_MODEL=base

# LiveKit — pick one:
# Cloud: LIVEKIT_URL=wss://your-project.livekit.cloud
# Local (no account): livekit-server --dev --bind 127.0.0.1
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Backend protection (localhost bypasses this)
BACKEND_SHARED_SECRET=

# Credential vault demo
EHR_API_TOKEN=
```

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
# Logs "registered worker" once connected to LiveKit
```

Local WebRTC needs no LiveKit account: install the open-source server once
(GitHub releases → `livekit_<version>_linux_amd64.tar.gz`), then run
`livekit-server --dev --bind 127.0.0.1` with the `devkey` / `secret`
credentials shown above. With Cloud, replace the three `LIVEKIT_*` values and
keep `LIVEKIT_URL` as `wss://...`.

All three must be up for real-time voice. Without the worker the encounter stays
usable: typed chat streams through the backend and replies are spoken with the
browser's Turkish voice. Run `npm run voice:doctor` to see exactly which values
are missing.

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
  agents/             # Debrief client, rubric request builder, evaluation schema
backend/
  server.py           # FastAPI: free-model debrief/patient/triage + /voice/token
  voice_agent.py      # LiveKit Agents worker (faster-whisper → Nemotron → edge-tts)
.claude/skills/       # Authoring skills (patient generator, rubric author, guideline curator, ...)
scripts/verify/       # Deterministic data-integrity checks
```

---

## Model routing

| Call | Model | Why |
|---|---|---|
| Patient voice persona | `openrouter/free` (`PATIENT_MODEL`) | Fast and free; good enough for in-character reply |
| Triage classifier | `openrouter/free` (`TRIAGE_MODEL`) | One-shot ESI classification; overridable |
| Debrief grading | `openrouter/free` (`GRADER_MODEL`) | One structured call; scores are recomputed server-side |

---

## Performance budget

The 3D consultation room is deliberately capped: 8 fps while idle, 30 fps only
while the pointer is locked or the doctor is moving, no real-time shadow maps,
and an internal render buffer around 1280 px wide. Decorative CSS animations
are static (only the one-shot entrance animation remains). This keeps laptops
cool; the scene is flat and cartoon-like, so the visual trade-off is small.

## Voice fallback

Real-time voice needs the FastAPI backend, the LiveKit worker, and either a
local `livekit-server` or LiveKit Cloud credentials. If the voice room cannot connect, the encounter stays usable: the
speech panel offers typed chat through `/agent/patient/stream`, and replies are
spoken with the browser's Turkish `speechSynthesis` voice. This still requires
`OPENROUTER_API_KEY` on the backend.

## Notes

- **Group policy on Windows:** scripts call `node node_modules/<pkg>/bin/<entry>.js` instead of the `.bin` shims because some corporate machines block `.exe` wrappers under `node_modules/`. Keep this pattern when adding new scripts.
- **Local voice stack:** faster-whisper downloads its model on first use and runs on CPU; `WHISPER_MODEL=base` is the default. edge-tts needs `ffmpeg` on `PATH`.
- **Free-tier LLM routing:** patient, triage, debrief and voice paths use OpenRouter's OpenAI-compatible API with `:free` models. Swap `PATIENT_MODEL` / `TRIAGE_MODEL` / `GRADER_MODEL` / `LLM_PROVIDER` in `.env.local` without code changes. `npm run voice:doctor` checks the whole voice setup.
- **Out of scope:** multi-agent handoffs, persistent user accounts, anything claiming clinical accuracy.

---

## License

Public for review. No open-source license is granted — do not redistribute without permission from the author.
