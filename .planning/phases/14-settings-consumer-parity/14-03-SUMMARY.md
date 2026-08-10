---
phase: 14-settings-consumer-parity
plan: 03
subsystem: account
tags: [delete-account, storage, rpc, supabase, vitest, tdd]

# Dependency graph
requires: []
provides:
  - lib/account/delete-account.ts — deleteAccountData orchestration (Storage → RPC → admin.deleteUser)
  - 7 unit tests covering order, pagination, and short-circuit-on-error
affects:
  - 14-06 (POST /api/user/delete route imports deleteAccountData)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Paginated storage.list loop (limit 100) before single remove() call"
    - "Fixed teardown order: ugc-photos → delete_account_data RPC → auth.admin.deleteUser"
    - "Wave 0 lib-only TDD before route/UI wiring"

key-files:
  created:
    - lib/account/delete-account.ts
    - lib/account/delete-account.test.ts
  modified: []

key-decisions:
  - "Hard delete via default deleteUser(userId) — no shouldSoftDelete opt-in"
  - "Zero storage files skips remove() but still runs RPC and admin.deleteUser"
  - "Call order asserted explicitly via shared callOrder array in tests (Pitfall 1)"

patterns-established:
  - "Service-role helper receives SupabaseClient param; never constructs its own client"
  - "{ error: string | null } return contract matches lib/user/locale.ts mutations"

requirements-completed: [SET-04]

coverage:
  - id: D1
    description: "deleteAccountData enforces storage → rpc → admin.deleteUser order"
    requirement: SET-04
    verification:
      - kind: unit
        ref: "lib/account/delete-account.test.ts#happy path — storage list/remove, then rpc, then admin.deleteUser in order"
        status: pass
    human_judgment: false
  - id: D2
    description: "Paginated storage cleanup accumulates >1 page before single remove()"
    requirement: SET-04
    verification:
      - kind: unit
        ref: "lib/account/delete-account.test.ts#paginated storage list — accumulates all pages into one remove call"
        status: pass
    human_judgment: false
  - id: D3
    description: "Short-circuit on error at each step — no partial-success path"
    requirement: SET-04
    verification:
      - kind: unit
        ref: "lib/account/delete-account.test.ts#storage list error / rpc error / admin.deleteUser error"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-11
status: complete
---

# Phase 14 Plan 03: deleteAccountData Lib Foundation Summary

**Tested deleteAccountData orchestration — paginated Storage cleanup, RPC, then hard auth delete with explicit call-order and short-circuit assertions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-10T22:42:00Z
- **Completed:** 2026-08-10T22:46:09Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `lib/account/delete-account.ts` exporting `deleteAccountData(serviceClient, userId)`
- Paginated `ugc-photos` list loop (limit 100) accumulates paths before single `remove()` call
- Fixed order: Storage → `rpc('delete_account_data')` → `auth.admin.deleteUser()` with early return on each error
- 7 vitest cases green: happy path, zero files, pagination, list/rpc/auth error short-circuits, full success

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

- Hard delete uses default `deleteUser(userId)` — no `shouldSoftDelete` parameter (D-16)
- Test mock uses shared `callOrder` array to prove step sequence, not just call presence

## Commits

| Hash | Message |
|------|---------|
| c0b3681 | test(14-03): add failing tests for deleteAccountData |
| 7d644b3 | feat(14-03): implement deleteAccountData orchestration |

## Self-Check: PASSED

- FOUND: lib/account/delete-account.ts
- FOUND: lib/account/delete-account.test.ts
- FOUND: c0b3681
- FOUND: 7d644b3
- `npx vitest run lib/account/delete-account.test.ts` — 7/7 passed
