#!/usr/bin/env bash
# Apply Supabase migrations via direct Postgres connection.
# Requires SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database).
#
# Usage:
#   export SUPABASE_DB_PASSWORD='your-db-password'
#   ./scripts/apply-supabase-migrations.sh
#
# Optional: SUPABASE_PROJECT_REF (default: wnerhajyjjmrtsdmdpzu)
# Optional: SUPABASE_DB_HOST (default: db.${REF}.supabase.co)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-wnerhajyjjmrtsdmdpzu}"
HOST="${SUPABASE_DB_HOST:-db.${REF}.supabase.co}"
SQL_FILE="${ROOT}/supabase/migrations/apply_all_idempotent.sql"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: Set SUPABASE_DB_PASSWORD (Supabase Dashboard → Project Settings → Database → password)" >&2
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: Missing $SQL_FILE" >&2
  exit 1
fi

export PGPASSWORD="$SUPABASE_DB_PASSWORD"

echo "Applying migrations to ${HOST}..."
psql "postgresql://postgres@${HOST}:5432/postgres?sslmode=require" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "Verifying anon read (requires .env.local)..."
if [[ -f "${ROOT}/.env.local" ]]; then
  ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY "${ROOT}/.env.local" | cut -d= -f2-)
  URL=$(grep NEXT_PUBLIC_SUPABASE_URL "${ROOT}/.env.local" | cut -d= -f2-)
  COUNT=$(curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Prefer: count=exact" -I "${URL}/rest/v1/listings?select=id" | rg -o 'content-range: [^\\r\\n]+' || true)
  echo "Anon listings: ${COUNT:-unknown}"
fi

echo "Done. Enable pg_cron in Dashboard → Database → Extensions if 005 failed on extension."
