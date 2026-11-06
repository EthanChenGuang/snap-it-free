#!/usr/bin/env bash
# Usage: doctor.sh RUN_DIR — read-only health check of an instance this skill started.
set -uo pipefail
RUN_DIR="$1"; ok=1
PID=$(cat "$RUN_DIR/pid"); PORT=$(cat "$RUN_DIR/port"); REPO=$(cat "$RUN_DIR/repo")
kill -0 "$PID" 2>/dev/null && echo "process $PID alive" || { echo "process $PID DEAD"; ok=0; }
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")
[ "$STATUS" = 200 ] && echo "GET / -> 200" || { echo "GET / -> $STATUS"; ok=0; }
[ "$(cat "$REPO/.next/BUILD_ID")" = "$(cat "$RUN_DIR/build_id")" ] && echo "build $(cat "$RUN_DIR/build_id") matches" || { echo "build changed since launch"; ok=0; }
echo "paywall flag in build: $(cat "$RUN_DIR/flag")"
echo "branch: $(git -C "$REPO" rev-parse --abbrev-ref HEAD) @ $(git -C "$REPO" rev-parse --short HEAD)"
[ "$ok" = 1 ] && echo DOCTOR_OK || { echo DOCTOR_FAIL; exit 1; }
