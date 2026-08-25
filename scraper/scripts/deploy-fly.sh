#!/usr/bin/env bash
# Deploy scraper worker to Fly.io (requires: fly auth login).
set -euo pipefail

SCRAPER="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SCRAPER/.." && pwd)"
ENV_FILE="$SCRAPER/.env"

export PATH="${FLYCTL_INSTALL:-$HOME/.fly}/bin:$PATH"

if ! command -v fly >/dev/null 2>&1; then
  echo "Install flyctl: curl -L https://fly.io/install.sh | sh" >&2
  exit 1
fi

if ! fly auth whoami >/dev/null 2>&1; then
  echo "Run: fly auth login" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required=(SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SCRAPER_SECRETS_KEY)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing $key in scraper/.env" >&2
    exit 1
  fi
done

cd "$REPO_ROOT"

if ! fly apps list 2>/dev/null | grep -q 'shoumanwu-scraper'; then
  echo "Creating Fly app shoumanwu-scraper (no deploy yet)..."
  fly apps create shoumanwu-scraper --org personal 2>/dev/null || fly launch --no-deploy --config scraper/fly.toml --copy-config --name shoumanwu-scraper --yes
fi

echo "Setting Fly secrets..."
secret_args=(
  "SUPABASE_URL=$SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
  "SCRAPER_SECRETS_KEY=$SCRAPER_SECRETS_KEY"
)
if [[ -n "${PROXY_URL:-}" ]]; then
  secret_args+=("PROXY_URL=$PROXY_URL")
fi
if [[ -n "${PUSHPLUS_TOKEN:-}" ]]; then
  secret_args+=("PUSHPLUS_TOKEN=$PUSHPLUS_TOKEN")
fi
if [[ -n "${CALLMEBOT_PHONE:-}" ]]; then
  secret_args+=("CALLMEBOT_PHONE=$CALLMEBOT_PHONE")
fi
if [[ -n "${CALLMEBOT_APIKEY:-}" ]]; then
  secret_args+=("CALLMEBOT_APIKEY=$CALLMEBOT_APIKEY")
fi
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  secret_args+=("TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN")
fi
if [[ -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  secret_args+=("TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID")
fi

fly secrets set "${secret_args[@]}" -a shoumanwu-scraper

echo "Deploying worker..."
fly deploy --config scraper/fly.toml -a shoumanwu-scraper

echo "Ensuring worker machine is running..."
MACHINE_ID="$(fly machines list -a shoumanwu-scraper --json 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const m=JSON.parse(d||'[]'); console.log(m[0]?.id||'');});")"
if [[ -n "$MACHINE_ID" ]]; then
  fly machine start "$MACHINE_ID" -a shoumanwu-scraper 2>/dev/null || true
fi

echo ""
echo "Done. Tail logs with: cd scraper && npm run logs:fly"
echo "Check status: fly status -a shoumanwu-scraper"
echo "Tip: stop duplicate local workers to avoid double cron + 429 (npm run stop:dev:tunnel:scraper)"
