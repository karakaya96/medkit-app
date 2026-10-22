#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."

ENV_FILE="backend/.env.local"
REQUIRED=(OPENROUTER_API_KEY LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET)
fail=0

echo "Ses hazırlık denetimi"
echo "---------------------"

if [ -f "$ENV_FILE" ]; then
  echo "[ok]   $ENV_FILE mevcut"
else
  echo "[hata] $ENV_FILE yok — 'cp backend/.env.example backend/.env.local'"
  fail=1
fi

for key in "${REQUIRED[@]}"; do
  value=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
  if [ -n "${value// /}" ]; then
    echo "[ok]   $key dolu"
  else
    echo "[hata] $key boş"
    fail=1
  fi
done

for bin in "backend/.venv/bin/python" "backend/.venv-voice/bin/python"; do
  if [ -x "$bin" ]; then
    echo "[ok]   $bin"
  else
    echo "[hata] $bin yok"
    fail=1
  fi
done

if backend/.venv-voice/bin/python -c "import edge_tts" >/dev/null 2>&1; then
  echo "[ok]   edge-tts (Türkçe TTS) kurulu"
else
  echo "[hata] edge-tts kurulu değil — backend/.venv-voice/bin/pip install edge-tts"
  fail=1
fi

if backend/.venv-voice/bin/python -c "import faster_whisper" >/dev/null 2>&1; then
  echo "[ok]   faster-whisper (STT) kurulu"
else
  echo "[hata] faster-whisper kurulu değil"
  fail=1
fi

if command -v ffmpeg >/dev/null 2>&1; then
  echo "[ok]   ffmpeg $(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f3)"
else
  echo "[hata] ffmpeg yok"
  fail=1
fi

if curl -fsS --max-time 2 http://127.0.0.1:8787/health >/dev/null 2>&1; then
  echo "[ok]   backend çalışıyor (:8787)"
else
  echo "[bilgi] backend kapalı — terminal 2: backend/.venv/bin/python backend/server.py"
fi

lk_url=$(grep -E "^LIVEKIT_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
case "$lk_url" in
  ws://127.0.0.1*|ws://localhost*)
    if curl -fsS --max-time 2 http://127.0.0.1:7880 >/dev/null 2>&1; then
      echo "[ok]   yerel livekit-server çalışıyor (:7880)"
    else
      echo "[hata] yerel livekit-server kapalı — livekit-server --dev --bind 127.0.0.1"
      fail=1
    fi
    ;;
  wss://*)
    echo "[ok]   LiveKit Cloud URL ($lk_url)"
    ;;
esac

echo "---------------------"
if [ "$fail" -eq 0 ]; then
  echo "Hazır. Üç terminal: npm run dev | backend/.venv/bin/python backend/server.py | backend/.venv-voice/bin/python backend/voice_agent.py dev"
  exit 0
fi
echo "Eksikler var. $ENV_FILE içini doldurup tekrar çalıştır."
exit 1
