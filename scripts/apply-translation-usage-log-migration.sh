#!/usr/bin/env bash
# Apply translation usage log migration (027) via Supavisor session pooler (IPv4-friendly).
#
# Usage:
#   export SUPABASE_DB_PASSWORD='your-db-password'
#   ./scripts/apply-translation-usage-log-migration.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-wnerhajyjjmrtsdmdpzu}"
HOST="${SUPABASE_DB_HOST:-aws-0-eu-west-3.pooler.supabase.com}"
PGUSER="${SUPABASE_DB_USER:-postgres.${REF}}"
SQL_FILE="${ROOT}/supabase/migrations/027_translation_usage_log.sql"

if [[ -f "${ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^SUPABASE_DB_PASSWORD=|^SUPABASE_PROJECT_REF=|^SUPABASE_DB_HOST=|^SUPABASE_DB_USER=' "${ROOT}/.env.local" 2>/dev/null || true)
  set +a
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: Set SUPABASE_DB_PASSWORD in env or .env.local" >&2
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: Missing $SQL_FILE" >&2
  exit 1
fi

export PGPASSWORD="$SUPABASE_DB_PASSWORD"

echo "Applying ${SQL_FILE} to ${HOST} as ${PGUSER}..."
psql "postgresql://${PGUSER}@${HOST}:5432/postgres?sslmode=require" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "Migration 027 applied."
