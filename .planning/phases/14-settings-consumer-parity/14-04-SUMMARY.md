---
phase: 14-settings-consumer-parity
plan: 04
subsystem: i18n
tags: [i18n, messages, settings, dnd, account, vitest]

# Dependency graph
requires: []
provides:
  - settings.dnd.* trilingual keys (7 keys × 3 locales)
  - settings.account.* trilingual keys (7 keys × 3 locales)
  - key-parity verified across zh/en/it
affects:
  - 14-05 (NotificationsSection consumes settings.dnd.*)
  - 14-06 (AccountSection consumes settings.account.*)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Function-typed i18n keys for pluralized warnings (activeClaimsWarning)"
    - "Wave 0 single-owner locale file edits to avoid same-wave conflicts"

key-files:
  created: []
  modified:
    - messages/en.ts
    - messages/it.ts
    - messages/zh.ts

key-decisions:
  - "ZH activeClaimsWarning uses single template (no n===1 branch) — Chinese does not pluralize count words"
  - "dnd placed after sound; account placed after advanced — sibling nesting per UI-SPEC"

patterns-established:
  - "New settings nested objects added without touching existing push/advanced keys"

requirements-completed: [I18N-01]

coverage:
  - id: D1
    description: "settings.dnd.* keys (7) present and translated in zh/en/it"
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts#zh, en, and it share identical nested key paths"
        status: pass
    human_judgment: false
  - id: D2
    description: "settings.account.* keys (7) including activeClaimsWarning function in zh/en/it"
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts#leaf nodes are strings or functions consistently across catalogs"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-11
status: complete
---

# Phase 14 Plan 04: DND + Account i18n Keys Summary

**14 trilingual settings.dnd/account keys added to messages/{zh,en,it}.ts with key-parity green**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-10T22:45:07Z
- **Completed:** 2026-08-10T22:47:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added `settings.dnd.*` (7 keys) for Do Not Disturb quiet-hours UI in zh/en/it
- Added `settings.account.*` (7 keys) for delete-account flow in zh/en/it
- `activeClaimsWarning(n)` function with EN/IT singular/plural branches; ZH single template
- `messages/key-parity.test.ts` passes — identical nested key paths across all three catalogs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add settings.dnd.* and settings.account.* keys** - `27a6fae` (feat)

**Plan metadata:** `a7ae721` (docs: complete plan)

## Files Created/Modified
- `messages/en.ts` - EN source copy for dnd + account sections
- `messages/it.ts` - Italian translations matching existing tone
- `messages/zh.ts` - Chinese translations; single-template activeClaimsWarning

## Decisions Made
- ZH `activeClaimsWarning` uses one template (no n===1 branch) per Chinese count-word convention
- Keys placed as siblings inside `settings` without modifying existing push/advanced/sound content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit` reports pre-existing errors in unrelated files (`lib/i18n/listing-fields.test.ts`, `lib/map/group-markers.test.ts`, `lib/user/notification-prefs.test.ts`, `scraper-admin/`) — not introduced by this plan; key-parity and message file types verified via vitest

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 14-05 and 14-06 can consume `messages.settings.dnd.*` and `messages.settings.account.*` via `useMessages()` without editing locale files
- Wave 0 i18n foundation complete for settings consumer parity phase

---
*Phase: 14-settings-consumer-parity*
*Completed: 2026-08-11*

## Self-Check: PASSED
- FOUND: messages/en.ts
- FOUND: messages/it.ts
- FOUND: messages/zh.ts
- FOUND: .planning/phases/14-settings-consumer-parity/14-04-SUMMARY.md
- FOUND: commit 27a6fae
