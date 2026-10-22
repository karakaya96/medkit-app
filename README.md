# medkit

Browser-based ER + polyclinic clinical training simulator. You play the doctor: new patients arrive at triage, you talk to them in real time, order tests, treat, disposition. A free-tier attending grader reviews your decisions after the encounter.

> Hackathon submission. Cases are plausible but synthetic — no clinical claims.

---

## About

Medkit is a voice-first AI patient simulator for medical students and newly graduated doctors. You take the history, order labs, read imaging, diagnose, and prescribe — talking to AI patients in real time. After each session, an attending grader running on a free NVIDIA Nemotron model marks your communication, history-taking, and clinical reasoning, citing published guidelines (NICE, ESC, AHA, GINA, GOLD) from a curated registry so the grading can't fabricate sources.

The format is modelled on OSCE training with standardised patients, which works well but is expensive, scheduled rarely, requires physical attendance, and isn't available in many countries — leaving most trainees globally with little or no access. Medkit makes the same kind of practice available on demand in the browser.

Built in three days for the Opus 4.7 hackathon by a medical-doctor-turned-software-engineer ([@bedriyan](https://github.com/bedriyan)), using Claude Code with Opus 4.7.

---

## What's inside

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite, Three.js (`@react-three/fiber`, `@react-three/drei`) |
| Voice transport | LiveKit (Cloud free tier or local dev server) via `livekit-client` |
| Voice worker | Python `livekit-agents` — faster-whisper STT → Nemotron via NVIDIA NIM (OpenRouter fallback) → edge-tts (Turkish voices) |
| HTTP backend | FastAPI on `127.0.0.1:8787` — free debrief/patient/triage paths (NVIDIA primary, OpenRouter fallback) + LiveKit JWT mint |
| Attending grader | Free Nemotron model, single structured call (`/agent/debrief`) |
| Triage classifier | Free Nemotron model (OpenAI-compatible), configurable via `NVIDIA_TRIAGE_MODEL` |
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
| **NVIDIA NIM** (primary) | Patient persona, ESI triage and debrief grading | https://build.nvidia.com → API Keys | Yes — free API access |
| **OpenRouter** (fallback) | Automatic backup if NVIDIA fails | https://openrouter.ai → Keys | Yes — `:free` models, 20 req/min, **50/day** |
| **LiveKit** | Real-time WebRTC transport between browser ↔ voice worker | Cloud: https://cloud.livekit.io → project → Settings → Keys. **Or local, no account:** `livekit-server --dev` | Yes |

No Anthropic or paid API is required. Set `LLM_PROVIDER=nvidia`, `NVIDIA_API_KEY`
and the three `LIVEKIT_*` values; the backend and voice worker both use NVIDIA
directly. OpenRouter's `:free` models are rate-limited to about 50 requests/day
without credits, so it is only a fallback — a one-time $10 credit raises the cap
to ~1,000/day but is not required. Pin a non-reasoning model for JSON tasks:
`openrouter/free` can pick a reasoning model that spends the whole budget on
hidden thinking and returns empty/truncated JSON.

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
# Primary free LLM path (patient, triage, debrief)
LLM_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_GRADER_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_PATIENT_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_TRIAGE_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b

# Optional OpenRouter fallback (50 free requests/day):
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_GRADER_MODEL=nvidia/nemotron-3.5-lightning:free
OPENROUTER_PATIENT_MODEL=nvidia/nemotron-3.5-lightning:free
OPENROUTER_TRIAGE_MODEL=nvidia/nemotron-3.5-lightning:free

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
| Patient voice persona | `nvidia/nemotron-3.5-lightning-30b-a3b` (`NVIDIA_PATIENT_MODEL`) | Fast and free; thinking disabled for low latency |
| Triage classifier | `nvidia/nemotron-3.5-lightning-30b-a3b` (`NVIDIA_TRIAGE_MODEL`) | One-shot ESI classification |
| Debrief grading | `nvidia/nemotron-3.5-lightning-30b-a3b` (`NVIDIA_GRADER_MODEL`) | One structured call; scores are recomputed server-side |

`LLM_PROVIDER` selects the primary; the other provider is used automatically if
the primary returns an error. OpenRouter model IDs keep the `:free` suffix,
NVIDIA NIM uses the direct `-30b-a3b` ID.

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
a configured LLM key (`NVIDIA_API_KEY` or `OPENROUTER_API_KEY`) on the backend.

## Notes

- **Group policy on Windows:** scripts call `node node_modules/<pkg>/bin/<entry>.js` instead of the `.bin` shims because some corporate machines block `.exe` wrappers under `node_modules/`. Keep this pattern when adding new scripts.
- **Local voice stack:** faster-whisper downloads its model on first use and runs on CPU; `WHISPER_MODEL=base` is the default. edge-tts needs `ffmpeg` on `PATH`.
- **Free-tier LLM routing:** patient, triage, debrief and voice paths use NVIDIA NIM first and OpenRouter `:free` as an automatic fallback. Swap `LLM_PROVIDER` or the provider-specific model variables in `.env.local` without code changes. `npm run voice:doctor` checks the whole voice setup.
- **Out of scope:** multi-agent handoffs, persistent user accounts, anything claiming clinical accuracy.

---

## License

Public for review. No open-source license is granted — do not redistribute without permission from the author.
