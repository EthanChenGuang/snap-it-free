---
phase: 09-feed-first-home-navigation-ia
plan: 01
subsystem: ui
tags: [nextjs, navigation, feed-grid, i18n, app-router]

requires: []
provides:
  - FeedHomeClient two-column grid at /
  - Four-tab bottom nav (Home · Post · Favorites · Settings)
  - Permanent /list → / redirect
  - AppChrome without map-first Header
affects: [09-02, 09-03, 09-04]

tech-stack:
  added: []
  patterns:
    - "Post tab auth gate via useAuthSession + AuthPromptModal"
    - "Active nav tab Material FILL 1 + bold text-primary"

key-files:
  created:
    - components/listings/FeedHomeClient.tsx
  modified:
    - app/page.tsx
    - app/list/page.tsx
    - components/shell/BottomNav.tsx
    - components/shell/AppChrome.tsx
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts
    - components/shell/NavMenuDrawer.tsx
    - components/shell/Header.tsx

key-decisions:
  - "D-01 locked: four-tab bottom nav supersedes NAV-02 drawer-only Post (user confirmed proceed-4-tab)"
  - "Feed empty state uses list.* keys until feed.* keys added in Plan 02"

patterns-established:
  - "Consumer shell omits Header; bottom nav on all routes except admin and listing detail"
  - "Feed grid uses grid-cols-2 gap-space-md with ListListingCard reuse"

requirements-completed: [NAV-01, NAV-02, NAV-04, HOME-01, HOME-03, I18N-01]

coverage:
  - id: D1
    description: GET / renders two-column FeedHomeClient grid (not map home)
    requirement: NAV-04
    verification:
      - kind: unit
        ref: "grep FeedHomeClient app/page.tsx"
        status: pass
    human_judgment: true
    rationale: Visual grid layout at 375px requires manual confirmation
  - id: D2
    description: GET /list returns permanent redirect to /
    requirement: HOME-03
    verification:
      - kind: integration
        ref: "grep permanentRedirect app/list/page.tsx"
        status: pass
    human_judgment: true
    rationale: HTTP 308 Location header requires dev server curl check
  - id: D3
    description: Four-tab bottom nav with filled active icon and Post auth gate
    requirement: NAV-01
    verification:
      - kind: unit
        ref: "grep grid_view components/shell/BottomNav.tsx"
        status: pass
    human_judgment: true
    rationale: AuthPromptModal on logged-out Post tap requires manual tap test
  - id: D4
    description: nav.home and nav.favorites keys in zh/en/it
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-09
status: complete
---

# Phase 9 Plan 01: Feed Home + 4-Tab Nav Summary

**Grid feed at `/` with four-tab Stitch bottom nav, Post auth gate, and permanent `/list` redirect — map-first home retired from consumer shell**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-09T11:53:00Z
- **Completed:** 2026-08-09T12:05:00Z
- **Tasks:** 3 (1 checkpoint pre-approved, 1 tracer, 1 cleanup)
- **Files modified:** 10

## Accomplishments

- Swapped `/` from MapHomeClient to FeedHomeClient with 2-column grid (`grid-cols-2 gap-space-md`)
- Restructured BottomNav: Home (`grid_view`) · Post (`add_box`, auth gate) · Favorites · Settings (UnreadMatchBadge)
- Added `permanentRedirect('/')` on `/list` per D-30
- Removed Header from AppChrome on consumer routes (D-07/D-31)
- Added `nav.home` / `nav.favorites` i18n keys (zh/en/it)
- Documented NAV-02 override: Post is bottom tab per locked D-01

## Task Commits

1. **Task 1: Confirm 4-tab bottom nav** — pre-approved (`proceed-4-tab`); no code commit
2. **Task 2: End-to-end feed home + 4-tab nav + /list redirect** — `295cf4f` (feat)
3. **Task 3: Grep cleanup** — `5d861d7` (chore)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `components/listings/FeedHomeClient.tsx` — Feed grid client with poll, reported-ID filter, Stitch empty state
- `app/page.tsx` — Server fetch + FeedHomeClient render
- `app/list/page.tsx` — permanentRedirect to `/`
- `components/shell/BottomNav.tsx` — Four-tab nav with FILL active icons and Post auth gate
- `components/shell/AppChrome.tsx` — Header removed; bottom nav except listing detail
- `messages/{zh,en,it}.ts` — nav.home, nav.favorites keys
- `components/shell/NavMenuDrawer.tsx` — Legacy drawer updated to home (not mounted)
- `components/shell/Header.tsx` — Retirement comment (not mounted)

## Decisions Made

- **D-01 confirmed:** User pre-approved `proceed-4-tab`; four-tab nav supersedes NAV-02 drawer-only Post
- Empty feed uses `list.emptyTitle` / `list.emptyDescription` until Plan 02 adds `feed.*` keys

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Pre-existing test failure:** `lib/admin/subito-regalo-catalog.test.ts` (3 tests) — out of scope, not introduced by this plan
- **Pre-existing build failure:** `lib/admin/cleanup.ts` TypeScript error — out of scope, blocks `npm run build` repo-wide

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 09-02: Feed header row, scroll-away, inline search, description migration
- Browse-center and select-location remain Plan 03

## Self-Check: PASSED

- FOUND: components/listings/FeedHomeClient.tsx
- FOUND: .planning/phases/09-feed-first-home-navigation-ia/09-01-SUMMARY.md
- FOUND: 295cf4f
- FOUND: 5d861d7

---
*Phase: 09-feed-first-home-navigation-ia*
*Completed: 2026-08-09*
