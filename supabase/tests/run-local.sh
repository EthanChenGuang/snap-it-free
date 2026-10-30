#!/usr/bin/env bash
# Usage: supabase/tests/run-local.sh [PORT]
# Throwaway local Postgres only: starts supabase/postgres, applies the test shim and every numbered
# migration in order, runs supabase/tests/*.check.sql, prints their output, removes the container.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
PORT="${1:-55441}"
NAME="snapit-migration-check-$PORT"
IMAGE="public.ecr.aws/supabase/postgres:17.11.0.002"
export PGPASSWORD=postgres
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres -p "127.0.0.1:$PORT:5432" "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 60); do
  "${PSQL[@]}" -Atc "select exists(select 1 from pg_roles where rolname = 'service_role')" 2>/dev/null | grep -q t && break
  sleep 2
done

psql -h 127.0.0.1 -p "$PORT" -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -X -f supabase/tests/support/hosted-supabase-shim.sql
for migration in $(ls supabase/migrations/[0-9]*.sql | sort); do
  # Replay accommodation: 020 redefines listings_public with reordered columns, which `create or replace`
  # rejects; production evidently dropped the view by hand. 021/035/036 drop and recreate it anyway.
  if grep -q "create or replace view public.listings_public" "$migration"; then
    "${PSQL[@]}" -c "drop view if exists public.listings_public"
  fi
  "${PSQL[@]}" -f "$migration" >/dev/null 2>"/tmp/$NAME.err" || { echo "FAILED applying $migration"; cat "/tmp/$NAME.err"; exit 1; }
done
echo "applied $(ls supabase/migrations/[0-9]*.sql | wc -l | tr -d ' ') migrations in order"

for check in $(ls supabase/tests/*.check.sql | sort); do
  echo "== $check"
  "${PSQL[@]}" -At -f "$check" 2>&1 | sed -E "s/^psql:[^ ]+ NOTICE:  //"
done
