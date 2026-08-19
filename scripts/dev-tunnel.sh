#!/usr/bin/env bash
# Start Next.js dev server + ngrok tunnel for mobile testing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load PORT and NGROK_DOMAIN from .env.local when not set in the environment
if [[ -f "$ROOT/.env.local" ]]; then
  if [[ -z "${PORT:-}" ]]; then
    PORT="$(grep -E '^PORT=' "$ROOT/.env.local" | tail -1 | cut -d= -f2- | tr -d ' "'\''')"
  fi
  if [[ -z "${NGROK_DOMAIN:-}" ]]; then
    NGROK_DOMAIN="$(grep -E '^NGROK_DOMAIN=' "$ROOT/.env.local" | tail -1 | cut -d= -f2- | tr -d ' "'\''')"
  fi
fi
PORT="${PORT:-3003}"
NGROK_DOMAIN="${NGROK_DOMAIN:-mawkish-masonically-damon.ngrok-free.dev}"
WITH_SCRAPER="${WITH_SCRAPER:-0}"
PIDFILE="$ROOT/.dev-tunnel.pids"
DEV_PID=""
NGROK_PID=""
SCRAPER_PID=""

write_pidfile() {
  cat > "$PIDFILE" <<EOF
PORT=${PORT}
ORCH_PID=$$
DEV_PID=${DEV_PID}
NGROK_PID=${NGROK_PID}
SCRAPER_PID=${SCRAPER_PID}
EOF
}

cleanup() {
  echo ""
  echo "Shutting down..."
  if [[ -n "$NGROK_PID" ]]; then
    kill "$NGROK_PID" 2>/dev/null || true
  fi
  if [[ -n "$SCRAPER_PID" ]]; then
    kill "$SCRAPER_PID" 2>/dev/null || true
  fi
  if [[ -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
}

trap cleanup EXIT INT TERM

port_busy() {
  curl -sf "http://127.0.0.1:${PORT}" >/dev/null 2>&1 \
    || { command -v fuser >/dev/null 2>&1 && fuser "${PORT}/tcp" >/dev/null 2>&1; } \
    || { command -v lsof >/dev/null 2>&1 && lsof -ti ":${PORT}" >/dev/null 2>&1; }
}

free_port() {
  local port=$1
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1; then
    mapfile -t port_pids < <(lsof -ti ":${port}" 2>/dev/null || true)
    if ((${#port_pids[@]} > 0)); then
      kill "${port_pids[@]}" 2>/dev/null || true
    fi
  fi
}

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ERROR: ngrok is not installed or not on PATH." >&2
  exit 1
fi

cd "$ROOT"

if port_busy; then
  echo "Port ${PORT} is in use — stopping previous dev server..."
  free_port "$PORT"
  sleep 1
fi

echo "Starting Next.js dev server on port ${PORT}..."
PORT="$PORT" npm run dev &
DEV_PID=$!

echo "Waiting for http://127.0.0.1:${PORT} ..."
ready=false
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
    ready=true
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "ERROR: dev server exited before becoming ready." >&2
    exit 1
  fi
  sleep 1
done

if [[ "$ready" != "true" ]]; then
  echo "ERROR: dev server did not respond on port ${PORT} within 90s." >&2
  exit 1
fi

if ! kill -0 "$DEV_PID" 2>/dev/null; then
  echo "ERROR: dev server exited before becoming ready (port ${PORT} may still be in use)." >&2
  exit 1
fi

if [[ "$WITH_SCRAPER" == "1" ]]; then
  if [[ ! -d "$ROOT/scraper/node_modules" ]]; then
    echo "ERROR: scraper dependencies not installed. Run: cd scraper && npm ci" >&2
    exit 1
  fi
  if [[ ! -f "$ROOT/scraper/.env" ]]; then
    echo "WARNING: scraper/.env not found — copy scraper/.env.example and configure." >&2
  fi
  echo "Starting scraper worker (scheduler tick, CRON_ENABLED=true)..."
  (cd "$ROOT/scraper" && CRON_ENABLED=true CRAWLEE_PERSIST_STORAGE=false npm start) &
  SCRAPER_PID=$!
fi

echo "Starting ngrok tunnel → localhost:${PORT} (${NGROK_DOMAIN}) ..."
ngrok http "$PORT" --domain="$NGROK_DOMAIN" --log=stdout &
NGROK_PID=$!

write_pidfile

public_url=""
for _ in $(seq 1 30); do
  public_url="$(curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for t in data.get('tunnels', []):
        url = t.get('public_url', '')
        if url.startswith('https://'):
            print(url)
            break
except Exception:
    pass
" 2>/dev/null || true)"
  if [[ -n "$public_url" ]]; then
    break
  fi
  sleep 1
done

echo ""
echo "────────────────────────────────────────"
echo " Local:     http://localhost:${PORT}"
echo " Admin:     http://localhost:${PORT}/admin"
if [[ -n "$public_url" ]]; then
  echo " Public:    ${public_url}"
  echo " Admin:     ${public_url}/admin"
  echo " OAuth cb:  ${public_url}/auth/callback"
else
  echo " Public:    (open http://127.0.0.1:4040 for ngrok URL)"
fi
echo " ngrok UI:  http://127.0.0.1:4040"
if [[ -n "$SCRAPER_PID" ]]; then
  echo " Scraper:   worker running (pid ${SCRAPER_PID})"
fi
echo "────────────────────────────────────────"
if [[ -n "$SCRAPER_PID" ]]; then
  echo "Press Ctrl+C to stop dev server, ngrok, and scraper worker."
else
  echo "Press Ctrl+C to stop both dev server and ngrok."
fi
echo ""

wait "$DEV_PID"
