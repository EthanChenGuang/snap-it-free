#!/usr/bin/env bash
# Usage: cleanup.sh RUN_DIR — stops only the server this skill started. Evidence dirs are untouched.
set -uo pipefail
RUN_DIR="$1"
PID=$(cat "$RUN_DIR/pid" 2>/dev/null) || { echo "no pid in $RUN_DIR"; exit 0; }
# launch.sh starts the server under setsid, so its pid is also its own process group.
if [ "$(ps -o pgid= -p "$PID" 2>/dev/null | tr -d ' ')" = "$PID" ]; then
  kill -TERM -- "-$PID" 2>/dev/null
else
  echo "pid $PID is not a live group leader; nothing of ours to stop"
fi
sleep 2
PORT=$(cat "$RUN_DIR/port")
curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" && echo "port $PORT still answering" || echo "stopped (port $PORT free)"
rm -f "$RUN_DIR/pid"
