#!/usr/bin/env bash
# Usage: launch.sh [--build] [--flag on|off] [--port N] [--repo DIR]
# Builds (optional) and starts `next start` on a free port. Prints RUN_DIR and URL.
set -euo pipefail
REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
BUILD=0; FLAG=off; PORT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --build) BUILD=1 ;;
    --flag) FLAG="$2"; shift ;;
    --port) PORT="$2"; shift ;;
    --repo) REPO="$2"; shift ;;
    *) echo "unknown arg $1" >&2; exit 2 ;;
  esac
  shift
done
# Prerendering needs Node >= 22: the root layout reads `navigator` during render (global since Node 21).
if [ -n "${VERIFY_NODE_DIR:-}" ]; then export PATH="$VERIFY_NODE_DIR:$PATH"; fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || { echo "node $(node -v) is too old; set VERIFY_NODE_DIR to a Node 22 bin dir" >&2; exit 1; }
[ "$FLAG" = on ] || [ "$FLAG" = off ] || { echo "--flag must be on|off" >&2; exit 2; }
[ -f "$REPO/.env.local" ] || echo "warn: $REPO/.env.local missing; the feed will be empty" >&2

if [ -z "$PORT" ]; then
  PORT=$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
fi

FLAG_VALUE=""; [ "$FLAG" = on ] && FLAG_VALUE=true
if [ "$BUILD" = 1 ]; then
  (cd "$REPO" && NEXT_PUBLIC_PAYWALL_ENABLED="$FLAG_VALUE" npm run build) >&2
  echo "$FLAG" > "$REPO/.next/VERIFY_PAYWALL_FLAG"
fi
[ -f "$REPO/.next/BUILD_ID" ] || { echo "no build in $REPO/.next; pass --build" >&2; exit 1; }
BUILT_FLAG=$(cat "$REPO/.next/VERIFY_PAYWALL_FLAG" 2>/dev/null || echo unknown)
[ "$BUILT_FLAG" = "$FLAG" ] || { echo "build has flag=$BUILT_FLAG, wanted $FLAG; pass --build" >&2; exit 1; }

RUN_DIR="/tmp/verify-snap-it-free/run-$(date +%s)-$PORT"
mkdir -p "$RUN_DIR"
# The session leader writes its own pid, which is also the process group cleanup.sh stops.
(cd "$REPO" && NEXT_PUBLIC_PAYWALL_ENABLED="$FLAG_VALUE" PID_FILE="$RUN_DIR/pid" \
  setsid bash -c 'echo $$ >"$PID_FILE"; exec npx next start -p "$1" -H 127.0.0.1' _ "$PORT" \
  >"$RUN_DIR/server.log" 2>&1 </dev/null &)
echo "$PORT" >"$RUN_DIR/port"; echo "$FLAG" >"$RUN_DIR/flag"; echo "$REPO" >"$RUN_DIR/repo"
cat "$REPO/.next/BUILD_ID" >"$RUN_DIR/build_id"

for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/"; then
    echo "RUN_DIR=$RUN_DIR"; echo "URL=http://127.0.0.1:$PORT"; exit 0
  fi
  sleep 1
done
echo "server not ready; see $RUN_DIR/server.log" >&2; exit 1
