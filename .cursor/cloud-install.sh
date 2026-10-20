#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

node <<'NODE'
const [major, minor] = process.versions.node.split(".").map(Number);
const ok =
  major >= 26 ||
  (major === 24 && minor >= 11) ||
  (major === 22 && minor >= 19);
if (!ok) {
  console.error(
    `REA requires Node.js ^22.19.0, ^24.11.0, or >=26 (current: ${process.version})`,
  );
  process.exit(1);
}
NODE

command -v ps >/dev/null || { echo "REA requires procps (ps) on Linux" >&2; exit 1; }

npm ci
NPM_BIN="$(command -v npm)"
sudo env "PATH=$PATH" "$NPM_BIN" install -g rea-agents@6.5.0

rea --version | grep -Fx '6.5.0'
