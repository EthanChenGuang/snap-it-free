---
phase: 14-settings-consumer-parity
plan: 06
subsystem: settings
tags: [settings, delete-account, api, danger-zone, auth]

# Dependency graph
requires:
  - phase: 14-01
    provides: delete_account_data RPC live on Supabase
  - phase: 14-03
    provides: lib/account/delete-account.ts pipeline
  - phase: 14-04
    provides: settings.account.* i18n keys
provides:
  - GET/POST /api/user/delete route (claim count + destructive delete)
  - AccountSection danger-zone UI with two-step confirm
  - Settings section order updated (Language → Account → Advanced)
affects:
  - 14-07 (remaining settings parity work)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step inline confirm state machine shared with AdvancedSection"
    - "Live active-claims count via authenticated GET before irreversible POST"
    - "Post-delete client cleanup: events → resetLocalAppData → signOut → redirect"

key-files:
  created:
    - app/api/user/delete/route.ts
    - components/settings/AccountSection.tsx
  modified:
    - components/settings/SettingsPageClient.tsx

key-decisions:
  - "AccountSection returns null when logged out — destructive action requires session"
  - "userId always from requireAuth(); request body never parsed for target user (IDOR closed)"
  - "Section inserted between LanguageSection and AdvancedSection per UI-SPEC D-13 resolution"

patterns-established:
  - "Delete account: GET preview count → two-step confirm → POST → client cleanup chain"

requirements-completed: [SET-04]

coverage:
  - id: D1
    description: "GET /api/user/delete returns live activeClaims count for status=claimed listings"
    requirement: SET-04
    verification:
      - kind: static
        ref: "grep status', 'claimed' app/api/user/delete/route.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "POST /api/user/delete invokes deleteAccountData via service-role client"
    requirement: SET-04
    verification:
      - kind: static
        ref: "grep deleteAccountData app/api/user/delete/route.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "AccountSection two-step confirm with active-claims warning and post-delete cleanup"
    requirement: SET-04
    verification:
      - kind: static
        ref: "grep confirming|FAVORITES_CHANGE_EVENT|signOut components/settings/AccountSection.tsx"
        status: pass
    human_judgment: true

duration: 5min
completed: 2026-08-11
status: complete
---

# Phase 14 Plan 06: Delete Account End-to-End Summary

**Delete Account fully wired — live claim warning, two-step confirm, GET/POST route, post-delete cleanup**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-10T22:44:00Z
- **Completed:** 2026-08-10T22:49:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `GET/POST /api/user/delete` — GET returns live `activeClaims` count; POST runs `deleteAccountData` pipeline
- Built `AccountSection` with exact two-step inline confirm from `AdvancedSection` (confirming/onBlur state machine)
- Active-claims warning renders only when count > 0, using `activeClaimsWarning(n)` i18n function
- Post-delete cleanup: dispatch favorites/reports events → `resetLocalAppData()` → `signOut()` → redirect `/`
- Inserted `<AccountSection />` between `<LanguageSection />` and `<AdvancedSection />` per D-13

## Task Commits

Each task was committed atomically:

1. **Task 1: /api/user/delete route** - `4dcd564` (feat)
2. **Task 2: AccountSection UI + SettingsPageClient** - `4575c74` (feat)

## Files Created/Modified

- `app/api/user/delete/route.ts` — GET claim-count preview + POST destructive delete via service role
- `components/settings/AccountSection.tsx` — danger-zone section with two-step confirm and error handling
- `components/settings/SettingsPageClient.tsx` — section order updated (Language → Account → Advanced)

## Decisions Made

- AccountSection renders nothing when logged out (no session = no destructive action)
- userId exclusively from `requireAuth()` session — IDOR vector closed (T-14-10)
- Failed POST resets confirming state to idle and surfaces `deleteError` inline (D-12)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx tsc --noEmit` reports pre-existing errors in unrelated files (`lib/i18n/listing-fields.test.ts`, `lib/map/group-markers.test.ts`, `scraper-admin/`) — not introduced by this plan; new files pass linter with no errors

## User Setup Required

None - migration 022 (`delete_account_data` RPC) confirmed live via Plan 14-01 SUMMARY.

## Next Phase Readiness

- SET-04 delete-account vertical slice complete — logged-in user can delete account end-to-end
- Plan 14-07 can proceed with remaining settings consumer parity work

---
*Phase: 14-settings-consumer-parity*
*Completed: 2026-08-11*

## Self-Check: PASSED
- FOUND: app/api/user/delete/route.ts
- FOUND: components/settings/AccountSection.tsx
- FOUND: components/settings/SettingsPageClient.tsx
- FOUND: 4dcd564
- FOUND: 4575c74
