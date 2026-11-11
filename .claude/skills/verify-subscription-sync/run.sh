#!/usr/bin/env bash
# Runs the subscription-sync convergence check. Exit 0 = every scenario converges.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
exec npx vitest run --config .claude/skills/verify-subscription-sync/check/vitest.config.mts "$@"
