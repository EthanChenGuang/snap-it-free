#!/usr/bin/env bash
# Stop Next.js dev server, ngrok, and scraper worker started by dev-tunnel.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$ROOT/.dev-tunnel.pids"

if [[ -z "${PORT:-}" && -f "$ROOT/.env.local" ]]; then
  PORT="$(grep -E '^PORT=' "$ROOT/.env.local" | tail -1 | cut -d= -f2- | tr -d ' "'\''')"
fi
PORT="${PORT:-3003}"

stopped=0

stop_pid() {
  local label=$1
  local pid=$2
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "Stopping ${label} (pid ${pid})..."
    kill "$pid" 2>/dev/null || true
    stopped=1
  fi
}

if [[ -f "$PIDFILE" ]]; then
  # shellcheck disable=SC1090
  source "$PIDFILE"
  PORT="${PORT:-3003}"
  stop_pid "dev-tunnel orchestrator" "${ORCH_PID:-}"
  stop_pid "scraper worker" "${SCRAPER_PID:-}"
  stop_pid "ngrok tunnel" "${NGROK_PID:-}"
  stop_pid "Next.js dev server" "${DEV_PID:-}"
  rm -f "$PIDFILE"
fi

if command -v fuser >/dev/null 2>&1; then
  if fuser "${PORT}/tcp" >/dev/null 2>&1; then
    echo "Freeing port ${PORT}..."
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    stopped=1
  fi
elif command -v lsof >/dev/null 2>&1; then
  mapfile -t port_pids < <(lsof -ti ":${PORT}" 2>/dev/null || true)
  if ((${#port_pids[@]} > 0)); then
    echo "Freeing port ${PORT}..."
    kill "${port_pids[@]}" 2>/dev/null || true
    stopped=1
  fi
fi

stop_matching() {
  local label=$1
  local pattern=$2
  local pid

  while IFS= read -r pid; do
    [[ -z "$pid" || "$pid" == "$$" ]] && continue
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping ${label} (pid ${pid})..."
      kill "$pid" 2>/dev/null || true
      stopped=1
    fi
  done < <(pgrep -f "$pattern" 2>/dev/null || true)
}

stop_matching "dev-tunnel orchestrator" "${ROOT}/scripts/dev-tunnel.sh"
stop_matching "ngrok tunnel" "ngrok http ${PORT}"
stop_matching "Next.js dev server" "${ROOT}.*next dev"
stop_matching "scraper worker" "${ROOT}/scraper.*src/worker.ts"

if [[ "$stopped" -eq 0 ]]; then
  echo "Nothing to stop (port ${PORT} is free)."
else
  echo "Cleanup complete."
fi
