---
phase: 14-settings-consumer-parity
plan: 05
subsystem: api
tags: [dnd, quiet-hours, settings, vitest, web-push, rls]

# Dependency graph
requires:
  - phase: 14-settings-consumer-parity
    provides: user_notification_prefs table (14-01), lib/user/notification-prefs.ts (14-02), settings.dnd.* i18n keys (14-04)
provides:
  - GET/PATCH /api/user/notification-prefs RLS-scoped route
  - NotificationsSection DND toggle + time inputs with auto-save PATCH
  - process-events cron quiet-hours guard skipping fanOutMatchPush only
affects: [14-06, 14-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic DND PATCH with revert-on-failure and inline saveError"
    - "Hide-only DND visibility when push off — no server-side force-disable"
    - "Cron DND guard after alert_matches upsert, before fanOutMatchPush"

key-files:
  created:
    - app/api/user/notification-prefs/route.ts
  modified:
    - components/settings/NotificationsSection.tsx
    - lib/alerts/process-events.ts
    - lib/alerts/process-events.test.ts

key-decisions:
  - "DND sub-block hidden when push off without PATCHing dnd_enabled false (UI-SPEC hide-only resolution)"
  - "Native time input onChange auto-saves without debounce — discrete commit semantics"
  - "Failed PATCH reverts optimistic UI state and surfaces settings.dnd.saveError inline"

patterns-established:
  - "User prefs API route mirrors locale PATCH chain: requireAuth → JSON parse → validate → sync → error/success"

requirements-completed: [SET-01, SET-02]

coverage:
  - id: D1
    description: "GET/PATCH /api/user/notification-prefs with isValidQuietHoursPayload guard and D-08 defaults"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "grep isValidQuietHoursPayload app/api/user/notification-prefs/route.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "NotificationsSection DND toggle + time inputs auto-save via PATCH, gated on pushEnabled"
    requirement: SET-02
    verification:
      - kind: other
        ref: "grep dndPrefs + pushEnabled && components/settings/NotificationsSection.tsx"
        status: pass
    human_judgment: true
    rationale: "Visual layout and Settings screen interaction require manual verification"
  - id: D3
    description: "process-events skips fanOutMatchPush during active quiet hours but still upserts alert_matches"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "lib/alerts/process-events.test.ts#skips fanOutMatchPush during active quiet hours"
        status: pass
    human_judgment: false
  - id: D4
    description: "Push still fires when user has no notification prefs row"
    requirement: SET-02
    verification:
      - kind: unit
        ref: "lib/alerts/process-events.test.ts#still sends push when user has no notification prefs row"
        status: pass
    human_judgment: false
  - id: D5
    description: "SET-01 push toggle idempotency/concurrency unchanged by DND additions"
    requirement: SET-01
    verification:
      - kind: other
        ref: "grep handlePushToggle + busy in NotificationsSection; unique(user_id, endpoint) in 016 migration"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-11
status: complete
---

# Phase 14 Plan 05: DND End-to-End Wiring Summary

**RLS-scoped notification-prefs API, Settings DND UI with auto-save, and cron push suppression during quiet hours while preserving in-app matches**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-10T22:47:00Z
- **Completed:** 2026-08-10T22:52:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added GET/PATCH `/api/user/notification-prefs` backed by `syncUserNotificationPrefs` and `isValidQuietHoursPayload`
- Extended `NotificationsSection` with DND toggle and start/end time inputs (visible when push on, auto-save on change)
- Wired `processOneEvent` to skip `fanOutMatchPush` during active quiet hours while keeping `alert_matches` upsert unconditional
- Confirmed SET-01 push idempotency/concurrency guards unchanged (busy flag + unique constraint)

## Task Commits

Each task was committed atomically (TDD RED → GREEN for Task 1):

1. **Task 1: DND end-to-end — GET/PATCH route, NotificationsSection UI, cron enforcement**
   - `61f7891` (test) — failing process-events DND tests with user_notification_prefs mock
   - `6fd7550` (feat) — API route, NotificationsSection DND UI, process-events quiet-hours guard
2. **Task 2: SET-01 regression audit — push toggle idempotency/concurrency unchanged**
   - No commit (verification-only; evidence recorded below)

## Files Created/Modified
- `app/api/user/notification-prefs/route.ts` — GET defaults (D-08) + PATCH validation/sync
- `components/settings/NotificationsSection.tsx` — dndPrefs state, fetch on mount, DND rows gated on pushEnabled
- `lib/alerts/process-events.ts` — loadUserQuietHours + isQuietHoursActive guard before fanOutMatchPush
- `lib/alerts/process-events.test.ts` — DND suppression + no-prefs regression tests

## SET-01 Regression Evidence (Task 2)

| Check | Result |
|-------|--------|
| `handlePushToggle` present | `grep -c` → 2 (definition + JSX onChange) |
| `busy` concurrency guard | present in NotificationsSection |
| `unique (user_id, endpoint)` | present in `supabase/migrations/016_auth_alerts_push.sql` |
| DND paths isolated | `handleDndChange` + DND useEffect contain no `requestPushPermissionAndSubscribe` / `unsubscribePush` calls |

## Decisions Made
- Hide-only DND when push off — saved `dnd_enabled` preserved server-side (UI-SPEC resolution)
- No debounce on native `<input type="time">` — onChange fires on discrete commit
- Optimistic PATCH with revert to previous prefs on failure + inline `settings.dnd.saveError`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit` reports pre-existing errors in unrelated files (`scraper-admin/`, `lib/i18n/listing-fields.test.ts`, `lib/map/group-markers.test.ts`); changed files typecheck clean
- Vitest plan verify flag `-x` unsupported in v3.2.7 — ran `npx vitest run lib/alerts/process-events.test.ts` without `-x` (4/4 pass)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DND tracer complete — Plan 14-06 can build delete-account flow on the same API/UI/cron architecture pattern
- Manual UAT recommended: toggle DND on, set times, reload Settings to confirm persistence

## Self-Check: PASSED

- FOUND: app/api/user/notification-prefs/route.ts
- FOUND: components/settings/NotificationsSection.tsx (dndPrefs)
- FOUND: lib/alerts/process-events.ts (loadUserQuietHours, isQuietHoursActive)
- FOUND: lib/alerts/process-events.test.ts
- FOUND: commit 61f7891
- FOUND: commit 6fd7550

---
*Phase: 14-settings-consumer-parity*
*Completed: 2026-08-11*
