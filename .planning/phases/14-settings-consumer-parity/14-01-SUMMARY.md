---
phase: 14-settings-consumer-parity
plan: 01
subsystem: database
tags: [supabase, postgres, rls, security-definer, dnd, delete-account]

requires:
  - phase: 13-select-location-flow
    provides: Per-user Supabase table + RLS conventions established in prior phases
provides:
  - user_notification_prefs table with RLS for DND quiet hours (SET-02 foundation)
  - delete_account_data(uuid) RPC scoped to service_role (SET-04 foundation)
affects: [14-02, 14-03, 14-05, 14-06]

tech-stack:
  added: []
  patterns:
    - "Per-user prefs table + RLS mirroring 017_user_locale.sql"
    - "Security-definer RPC with search_path pinned and service_role-only execute"

key-files:
  created:
    - supabase/migrations/022_user_notification_prefs.sql
  modified: []

key-decisions:
  - "Used notification_prefs_insert_own policy name (not upsert_own) per PLAN.md explicit naming"
  - "Applied migration via Supavisor pooler (IPv4) after direct db.* host was unreachable in WSL2"

patterns-established:
  - "user_notification_prefs: one row per user, ON DELETE CASCADE to auth.users"
  - "delete_account_data: conversations[buyer] → listing_reports[reporter] → listings[owner] ordering"

requirements-completed: [SET-02, SET-04]

coverage:
  - id: D1
    description: "user_notification_prefs table with three RLS policies live on remote Supabase"
    requirement: SET-02
    verification:
      - kind: other
        ref: "psql verify: to_regclass('public.user_notification_prefs') is not null"
        status: pass
    human_judgment: false
  - id: D2
    description: "delete_account_data(uuid) security-definer RPC live, service_role execute only"
    requirement: SET-04
    verification:
      - kind: other
        ref: "psql verify: to_regprocedure('public.delete_account_data(uuid)') is not null"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-11
status: complete
---

# Phase 14 Plan 01: DB Foundation Summary

**user_notification_prefs table with RLS and service_role-scoped delete_account_data RPC pushed live to Supabase**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-10T22:38:00Z
- **Completed:** 2026-08-10T22:46:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Authored `022_user_notification_prefs.sql` with DND table (dnd_enabled, quiet_start/end, updated_at) and three RLS policies mirroring `017_user_locale.sql`
- Created `delete_account_data(uuid)` security-definer function with ordered deletes (buyer conversations → reporter reports → owned listings) and service_role-only execute grant
- Applied migration to live Supabase project `wnerhajyjjmrtsdmdpzu` and verified both objects exist remotely

## Task Commits

Each task was committed atomically:

1. **Task 1: Author migration 022** - `f19aeb7` (feat)
2. **Task 2: Push migration 022 to live Supabase** - deployment only (no file changes; verified via psql)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `supabase/migrations/022_user_notification_prefs.sql` - DND prefs table + RLS + delete_account_data RPC

## Decisions Made

- Applied via Supavisor session pooler (`aws-0-eu-west-3.pooler.supabase.com`, user `postgres.wnerhajyjjmrtsdmdpzu`) because direct `db.*` host failed with IPv6 network unreachable in WSL2
- Sourced `SUPABASE_DB_PASSWORD` from `.env.local` for psql fallback (not present in executor shell env; `SUPABASE_ACCESS_TOKEN` not required for direct psql path)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Supavisor pooler instead of direct db host**
- **Found during:** Task 2 (Push migration 022)
- **Issue:** `psql` to `db.wnerhajyjjmrtsdmdpzu.supabase.co` failed — IPv6 network unreachable in WSL2
- **Fix:** Applied migration via `aws-0-eu-west-3.pooler.supabase.com` with `postgres.wnerhajyjjmrtsdmdpzu` user (same pattern as `scripts/apply-phase3-migrations.sh`)
- **Files modified:** none (connection path only)
- **Verification:** Remote verify query returned `t`
- **Committed in:** N/A (deployment-only deviation)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Connection path change only; schema identical to plan. Remote objects confirmed live.

## Issues Encountered

None beyond the IPv6 connectivity issue (auto-fixed via pooler).

## User Setup Required

None — credentials loaded from existing `.env.local`.

## Next Phase Readiness

- Plan 14-02+ can implement lib/API layers against live `user_notification_prefs` and `delete_account_data`
- PostgREST schema cache may need a Dashboard reload if REST calls 404 before cache refresh

## Self-Check: PASSED

- FOUND: supabase/migrations/022_user_notification_prefs.sql
- FOUND: f19aeb7
- Remote verify: `user_notification_prefs` and `delete_account_data(uuid)` both exist

---
*Phase: 14-settings-consumer-parity*
*Completed: 2026-08-11*
