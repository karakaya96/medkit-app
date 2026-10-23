#!/usr/bin/env bash
# Tek terminalde medkit geliştirme ortamı.
#
#   npm run app         → Vite (5173) + FastAPI backend (8787)
#   npm run app:voice   → yukarıdakiler + LiveKit ses worker'ı
#
# Ctrl+C hepsini birlikte kapatır. Zaten açık olan bir servis atlanır,
# yani yanlışlıkla ikinci kez çalıştırmak zarar vermez.
set -uo pipefail
cd "$(dirname "$0")/.."

WITH_VOICE=0
for arg in "$@"; do
  case "$arg" in
    --voice|-v) WITH_VOICE=1 ;;
    --help|-h)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Bilinmeyen argüman: $arg (kullanım: --voice)"; exit 2 ;;
  esac
done

LOG_DIR="${MEDKIT_LOG_DIR:-/tmp}"
BACKEND_LOG="$LOG_DIR/medkit-backend.log"
VITE_LOG="$LOG_DIR/medkit-vite.log"
VOICE_LOG="$LOG_DIR/medkit-voice.log"

pids=()

# Alt süreç grubunu (varsa) kapatır. `setsid` ile başlattığımız servislerin
# kendi grupları vardır; tarayıcı gibi torunlar da böylece birlikte kapanır.
kill_tree() {
  local pid="$1" pgid
  pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
  if [ -n "$pgid" ] && [ "$pgid" = "$pid" ]; then
    kill -- "-$pgid" 2>/dev/null || true
  else
    kill "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  trap - INT TERM EXIT
  echo
  if [ "${#pids[@]}" -eq 0 ]; then
    exit 0
  fi
  echo "Kapatılıyor…"
  for pid in "${pids[@]}"; do
    kill_tree "$pid"
  done
  # Süreçlere kapanmaları için kısa süre tanı, sonra zorla.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    alive=0
    for pid in "${pids[@]}"; do
      kill -0 "$pid" 2>/dev/null && alive=1
    done
    [ "$alive" -eq 0 ] && break
    sleep 0.3
  done
  for pid in "${pids[@]}"; do
    pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$pgid" ] && [ "$pgid" = "$pid" ]; then
      kill -9 -- "-$pgid" 2>/dev/null || true
    else
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  echo "Tüm süreçler kapandı."
  exit 0
}
trap cleanup INT TERM EXIT

port_busy() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk -v p=":$1$" '$4 ~ p { found = 1 } END { exit !found }'
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
  fi
}

need_file() {
  if [ ! -e "$1" ]; then
    echo "[hata] $1 yok — önce README'deki kurulum adımını çalıştır." >&2
    exit 1
  fi
}

need_file node_modules
need_file backend/.venv/bin/python

if [ ! -f backend/.env.local ]; then
  echo "[uyarı] backend/.env.local yok — backend anahtarlar olmadan başlar ve"
  echo "        değerlendirme/patient çağrıları hata verir."
  echo "        Çözüm: cp backend/.env.example backend/.env.local"
fi

echo "medkit geliştirme ortamı"
echo "-----------------------"

# ── backend ─────────────────────────────────────────────
if port_busy 8787; then
  echo "[atla] backend zaten çalışıyor (:8787)"
else
  setsid backend/.venv/bin/python backend/server.py \
    > >(sed -u 's/^/[backend] /' | tee -a "$BACKEND_LOG") 2>&1 &
  pids+=("$!")
  echo "[başladı] backend → http://127.0.0.1:8787  (log: $BACKEND_LOG)"
fi

# ── frontend ────────────────────────────────────────────
if port_busy 5173; then
  echo "[atla] Vite zaten çalışıyor (:5173)"
else
  setsid node node_modules/vite/bin/vite.js --host 127.0.0.1 \
    > >(sed -u 's/^/[vite] /' | tee -a "$VITE_LOG") 2>&1 &
  pids+=("$!")
  echo "[başladı] Vite → http://127.0.0.1:5173  (log: $VITE_LOG)"
fi

# ── ses worker'ı (opsiyonel) ────────────────────────────
if [ "$WITH_VOICE" -eq 1 ]; then
  if [ ! -x backend/.venv-voice/bin/python ]; then
    echo "[uyarı] backend/.venv-voice yok — ses worker'ı atlandı." >&2
  else
    lk_url=$(grep -E "^LIVEKIT_URL=" backend/.env.local 2>/dev/null | head -1 | cut -d= -f2-)
    case "$lk_url" in
      ws://127.0.0.1*|ws://localhost*)
        if ! port_busy 7880; then
          echo "[uyarı] yerel livekit-server kapalı (:7880)."
          echo "        Ayrı bir terminalde: livekit-server --dev --bind 127.0.0.1"
        fi
        ;;
    esac
    setsid backend/.venv-voice/bin/python backend/voice_agent.py dev \
      > >(sed -u 's/^/[voice] /' | tee -a "$VOICE_LOG") 2>&1 &
    pids+=("$!")
    echo "[başladı] ses worker'ı  (log: $VOICE_LOG)"
  fi
fi

if [ "${#pids[@]}" -eq 0 ]; then
  echo
  echo "Her şey zaten çalışıyor. Tarayıcı: http://127.0.0.1:5173"
  exit 0
fi

echo "-----------------------"
echo "Hazır. Tarayıcı: http://127.0.0.1:5173"
echo "Durdurmak için Ctrl+C."
echo

# Çocuklardan biri ölürse haber ver ama diğerlerini ayakta tut.
while true; do
  wait -n 2>/dev/null
  rc=$?
  alive=0
  for pid in "${pids[@]}"; do
    kill -0 "$pid" 2>/dev/null && alive=1
  done
  if [ "$alive" -eq 0 ]; then
    echo "[bilgi] Tüm süreçler kapandı."
    exit 0
  fi
  if [ "$rc" -ne 127 ]; then
    echo
    echo "[uyarı] Bir süreç kapandı; diğerleri çalışmaya devam ediyor."
    echo "        Ayrıntı için yukarıdaki loglara bak. Çıkmak için Ctrl+C."
  fi
done
