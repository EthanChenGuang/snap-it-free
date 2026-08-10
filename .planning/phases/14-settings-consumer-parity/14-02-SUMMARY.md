---
phase: 14-settings-consumer-parity
plan: 02
subsystem: api
tags: [dnd, quiet-hours, supabase, vitest, europe-rome]

# Dependency graph
requires:
  - phase: 14-settings-consumer-parity
    provides: user_notification_prefs table (Plan 14-01 migration)
provides:
  - isQuietHoursActive overnight-wrap-aware enforcement primitive
  - loadUserQuietHours batch lookup with fail-open error handling
  - syncUserNotificationPrefs upsert for user_notification_prefs
  - isValidQuietHoursPayload PATCH body validation guard
affects: [14-05, 14-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable nowMinutes parameter for pure-function time tests (mirrors lib/alerts/* convention)"
    - "Fail-open batch lookup returning empty Map on query error (mirrors loadUserLocales)"
    - "HH:MM regex validation matching native input type=time value format"

key-files:
  created:
    - lib/user/notification-prefs.ts
    - lib/user/notification-prefs.test.ts
  modified: []

key-decisions:
  - "Europe/Rome hardcoded server-side for quiet-hours enforcement (D-03)"
  - "End-exclusive window comparison with midnight-wrap branch for overnight ranges"
  - "Fail-open loadUserQuietHours returns empty Map on error — DND off for batch (D-08 default)"

patterns-established:
  - "Pattern: lib/user/notification-prefs.ts mirrors lib/user/locale.ts for batch load + upsert + type guard"

requirements-completed: [SET-02]

coverage:
  - id: D1
    description: "isQuietHoursActive handles same-day, overnight-wrap, disabled, undefined, and 24h-always-on windows"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "lib/user/notification-prefs.test.ts#isQuietHoursActive"
        status: pass
    human_judgment: false
  - id: D2
    description: "loadUserQuietHours batch lookup with empty-input short-circuit and fail-open error path"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "lib/user/notification-prefs.test.ts#loadUserQuietHours"
        status: pass
    human_judgment: false
  - id: D3
    description: "syncUserNotificationPrefs upserts dnd_enabled/quiet_start/quiet_end with onConflict user_id"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "lib/user/notification-prefs.test.ts#syncUserNotificationPrefs"
        status: pass
    human_judgment: false
  - id: D4
    description: "isValidQuietHoursPayload rejects invalid dndEnabled and non-HH:MM time strings"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "lib/user/notification-prefs.test.ts#isValidQuietHoursPayload"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-08-10
status: complete
---

# Phase 14 Plan 02: DND Lib Foundation Summary

**Tested quiet-hours lib with Europe/Rome isQuietHoursActive, batch loadUserQuietHours, syncUserNotificationPrefs upsert, and isValidQuietHoursPayload guard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-10T22:44:00Z
- **Completed:** 2026-08-10T22:46:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Pure `isQuietHoursActive` function with injectable `nowMinutes` covering same-day, overnight-wrap, disabled, and no-row cases
- `loadUserQuietHours` batch lookup mirroring `loadUserLocales` with fail-open empty Map on error
- `syncUserNotificationPrefs` upsert and `isValidQuietHoursPayload` 24h HH:MM validation for Plan 14-05 API route

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: isQuietHoursActive — overnight-wrap-aware quiet-hours check**
   - `29dd5e2` (test) — failing tests for same-day, overnight, disabled, undefined, 24h cases
   - `28da14a` (feat) — implement isQuietHoursActive with Europe/Rome helpers
2. **Task 2: loadUserQuietHours, syncUserNotificationPrefs, isValidQuietHoursPayload**
   - `28a69bd` (test) — failing tests for batch lookup, upsert, validation
   - `f4626d1` (feat) — implement batch lookup, upsert, and payload guard

## Files Created/Modified
- `lib/user/notification-prefs.ts` — DND enforcement, batch lookup, upsert, and validation exports
- `lib/user/notification-prefs.test.ts` — 13 unit tests covering all lib surface

## Decisions Made
- Followed RESEARCH.md Pattern 2 verbatim for isQuietHoursActive midnight-wrap logic
- Mirrored lib/user/locale.ts shapes exactly for load/upsert/validate trinity
- Used `/^([01]\d|2[0-3]):[0-5]\d$/` regex matching native `<input type="time">` value format

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 14-05 can import `isQuietHoursActive`, `loadUserQuietHours`, `syncUserNotificationPrefs`, and `isValidQuietHoursPayload`
- All 13 unit tests green via `npx vitest run lib/user/notification-prefs.test.ts`

## Self-Check: PASSED
- FOUND: lib/user/notification-prefs.ts
- FOUND: lib/user/notification-prefs.test.ts
- FOUND: 29dd5e2, 28da14a, 28a69bd, f4626d1 (14-02 commits)
- Plan verification: `npx vitest run lib/user/notification-prefs.test.ts` — 13/13 passed

---
*Phase: 14-settings-consumer-parity*
*Completed: 2026-08-10*
