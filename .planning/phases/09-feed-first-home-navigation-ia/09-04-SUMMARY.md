---
phase: 09-feed-first-home-navigation-ia
plan: 04
subsystem: ui
tags: [react, nextjs, favorites, settings, i18n, stitch-ui]

requires:
  - phase: 09-01
    provides: four-tab BottomNav and AppChrome shell
  - phase: 09-02
    provides: FeedHeaderRow on home only (no app.title on feed)
provides:
  - SimpleTitleBar for /favorites and /settings routes
  - Favorites two-column grid with FavoriteButton unfavorite
  - Settings manage-posts link replacing NavMenuDrawer entry
  - Feed-first root layout metadata (app.title)
affects:
  - phase-12-favorites-category-folders
  - phase-14-settings-consumer-parity

tech-stack:
  added: []
  patterns:
    - "Route-conditional SimpleTitleBar in AppChrome for secondary tabs"
    - "Favorites grid wraps ListListingCard with absolute FavoriteButton overlay"

key-files:
  created:
    - components/shell/SimpleTitleBar.tsx
  modified:
    - components/shell/AppChrome.tsx
    - components/listings/FavoritesPageClient.tsx
    - components/settings/GeneralSection.tsx
    - app/layout.tsx

key-decisions:
  - "Fetch errors on favorites fall back to empty state (E5 backstop) instead of error UI"
  - "feed.browseFeed keys already present from 09-02 — no new message keys required in 04"

patterns-established:
  - "SimpleTitleBar: sticky centered text-h3 title bar for non-feed consumer routes"

requirements-completed: [NAV-01, I18N-01]

coverage:
  - id: D1
    description: "SimpleTitleBar renders centered title on /favorites and /settings only"
    requirement: NAV-01
    verification:
      - kind: unit
        ref: "npm run build (AppChrome + SimpleTitleBar compile)"
        status: unknown
    human_judgment: true
    rationale: "Full production build blocked by pre-existing lib/admin/cleanup.ts type error unrelated to this plan"
  - id: D2
    description: "Favorites two-column grid with FavoriteButton unfavorite per card"
    requirement: NAV-01
    verification: []
    human_judgment: true
    rationale: "Grid layout and heart toggle require visual verification in browser"
  - id: D3
    description: "Favorites empty CTA links to / with feed.browseFeed copy"
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Settings title bar shows app.title; manage-posts link in GeneralSection"
    requirement: NAV-01
    verification: []
    human_judgment: true
    rationale: "Title bar chrome and link navigation need manual browser check"
  - id: D5
    description: "Root layout metadata uses app.title without Map Explorer suffix"
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "grep app/layout.tsx — no Map Explorer"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-09
status: complete
---

# Phase 9 Plan 04: Favorites Grid + Settings Chrome Summary

**SimpleTitleBar on favorites/settings, two-column favorites grid with heart unfavorite, manage-posts link in settings, feed-first layout metadata**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-09T12:00:00Z
- **Completed:** 2026-08-09T12:04:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created `SimpleTitleBar` and wired `AppChrome` to show favorites page title and settings app title (D-35/D-45)
- Refactored `FavoritesPageClient` to 2-col grid with `ListListingCard` + `FavoriteButton`; removed zone chips and in-page h1
- Empty state uses Stitch bordered panel with `feed.browseFeed` CTA to `/`; fetch errors fall back to empty state (E5)
- Added `/post/manage` link in `GeneralSection` replacing retired NavMenuDrawer entry (D-46)
- Updated `app/layout.tsx` metadata from "Map Explorer" to `app.title` only

## Task Commits

Each task was committed atomically:

1. **Task 1: SimpleTitleBar + AppChrome route titles** - `2479fbf` (feat)
2. **Task 2: Favorites interim 2-col grid + empty CTA** - `fc3ed40` (feat)
3. **Task 3: Settings manage-posts link + layout metadata** - `78e3231` (feat)

## Files Created/Modified

- `components/shell/SimpleTitleBar.tsx` - Centered sticky title bar for secondary tabs
- `components/shell/AppChrome.tsx` - Route-conditional SimpleTitleBar on /favorites and /settings
- `components/listings/FavoritesPageClient.tsx` - 2-col grid, empty state, login gate on anonymous empty
- `components/settings/GeneralSection.tsx` - Manage my posts link row
- `app/layout.tsx` - Feed-first metadata title

## Decisions Made

- Supabase fetch failure shows empty state instead of error panel (E5 backstop per must_haves)
- Anonymous empty favorites shows sign-in button plus browse feed CTA (D-34 login gate)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fetch failure falls back to empty state**
- **Found during:** Task 2 (Favorites grid)
- **Issue:** Plan must_haves require E5 backstop — prior code showed error UI on fetch failure
- **Fix:** Catch block sets listings to [] and renders empty state panel
- **Files modified:** components/listings/FavoritesPageClient.tsx
- **Committed in:** fc3ed40

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Correctness improvement per threat model T-09-08; no scope creep.

## Issues Encountered

- `npm run build` fails on pre-existing TypeScript error in `lib/admin/cleanup.ts` (unrelated to Phase 9)
- `npm test` has 3 pre-existing failures in `lib/admin/subito-regalo-catalog.test.ts` (unrelated to Phase 9)
- `feed.browseFeed` i18n keys already existed from Plan 09-02 — no message file edits needed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 09-03 (select-location) still pending — Phase 9 not complete until 09-03 executes
- Favorites interim grid ready; Phase 12 will add category folders (D-36 deferred)
- Settings body restyle deferred to Phase 14 (D-44)

## Self-Check: PASSED

- FOUND: components/shell/SimpleTitleBar.tsx
- FOUND: components/listings/FavoritesPageClient.tsx
- FOUND: commit 2479fbf
- FOUND: commit fc3ed40
- FOUND: commit 78e3231

---
*Phase: 09-feed-first-home-navigation-ia*
*Completed: 2026-08-09*
