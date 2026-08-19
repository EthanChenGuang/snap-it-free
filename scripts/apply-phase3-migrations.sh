#!/usr/bin/env bash
# Apply Phase 3 Supabase migrations (006–009) via direct Postgres connection.
#
# Requires SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database → password).
# Optional: SUPABASE_PROJECT_REF (default wnerhajyjjmrtsdmdpzu)
# Optional: SUPABASE_DB_HOST (default db.${REF}.supabase.co)
#
# Usage:
#   export SUPABASE_DB_PASSWORD='your-db-password'
#   ./scripts/apply-phase3-migrations.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-wnerhajyjjmrtsdmdpzu}"
# Default to Supavisor session pooler (IPv4-friendly; direct db.* is IPv6-only in some environments)
HOST="${SUPABASE_DB_HOST:-aws-0-eu-west-3.pooler.supabase.com}"
PGUSER="${SUPABASE_DB_USER:-postgres.${REF}}"
MIG_DIR="${ROOT}/supabase/migrations"

# Also load from .env.local if present (do not commit passwords)
if [[ -f "${ROOT}/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a
  source <(grep -E '^SUPABASE_DB_PASSWORD=|^SUPABASE_PROJECT_REF=|^SUPABASE_DB_HOST=' "${ROOT}/.env.local" 2>/dev/null || true)
  set +a
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: Set SUPABASE_DB_PASSWORD in env or .env.local" >&2
  echo "  Supabase Dashboard → Project Settings → Database → Database password" >&2
  exit 1
fi

export PGPASSWORD="$SUPABASE_DB_PASSWORD"
PSQL=(psql "postgresql://${PGUSER}@${HOST}:5432/postgres?sslmode=require" -v ON_ERROR_STOP=1)

apply() {
  local file="$1"
  echo "→ Applying $(basename "$file")..."
  "${PSQL[@]}" -f "$file"
}

echo "Applying Phase 3 migrations to ${HOST}..."
for n in 006_listings_public_view.sql 007_ugc_messaging_reports.sql 008_messaging_fcfs.sql 009_report_auto_hide_trigger.sql 010_listings_public_security_definer.sql; do
  apply "${MIG_DIR}/${n}"
done

echo "Verifying schema..."
"${PSQL[@]}" -c "select column_name from information_schema.columns where table_schema='public' and table_name='listings' and column_name='owner_user_id';" | rg owner_user_id
"${PSQL[@]}" -c "select to_regclass('public.listings_public') as listings_public, to_regclass('public.conversations') as conversations, to_regclass('public.listing_reports') as listing_reports;"

echo "Done. Reload PostgREST schema cache in Dashboard if tables still 404 via REST."
