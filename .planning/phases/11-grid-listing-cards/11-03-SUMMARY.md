---
phase: 11-grid-listing-cards
plan: 03
subsystem: ui
tags: [react, favorites, distance, grid-card, haversine]

requires:
  - phase: 11-grid-listing-cards
    provides: ListListingCard with in-card FavoriteButton and buildCardMetadata from Plans 01–02
provides:
  - Single heart per favorites card (duplicate wrapper removed per D-11)
  - Favorites distanceMeters parity with home feed via useDistanceCenter(false)
  - Favorites grid gap-3 aligned with FeedHomeClient per D-26
affects: [11-04-PLAN, verify-work UAT on /favorites]

tech-stack:
  added: []
  patterns:
    - "Favorites computes per-listing distanceMeters inline with haversineKm — no composeFeedListings per D-30"
    - "useDistanceCenter(false) resolves center chain without radius filtering"

key-files:
  created: []
  modified:
    - components/listings/FavoritesPageClient.tsx

key-decisions:
  - "Inline haversine per listing in favorites map — mirrors feed distanceMap math without feed pipeline (D-30)"
  - "useDistanceCenter(false) — radius off, center browse → GPS → Venice still resolves (D-23)"

patterns-established:
  - "Favorites grid renders ListListingCard directly as grid child — no outer FavoriteButton wrapper"

requirements-completed: [CARD-02, CARD-04]

coverage:
  - id: D1
    description: "Zero FavoriteButton references in FavoritesPageClient; single in-card heart only"
    requirement: CARD-04
    verification:
      - kind: other
        ref: "test \"$(rg -c 'FavoriteButton' components/listings/FavoritesPageClient.tsx)\" -eq 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Favorites passes distanceMeters via useDistanceCenter(false) + haversineKm"
    requirement: CARD-02
    verification:
      - kind: other
        ref: "rg 'useDistanceCenter|distanceMeters|haversineKm' components/listings/FavoritesPageClient.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Favorites grid uses gap-3 matching feed"
    requirement: CARD-02
    verification:
      - kind: other
        ref: "rg 'gap-3' components/listings/FavoritesPageClient.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual UAT — /favorites shows single heart and distance · time when center active"
    requirement: CARD-02
    verification: []
    human_judgment: true
    rationale: "Visual confirmation of single heart and distance metadata requires human check on /favorites"

duration: 2min
completed: 2026-08-10
status: complete
---

# Phase 11 Plan 03: Favorites Grid Fix Summary

**Removed duplicate favorites heart wrapper, wired distanceMeters via useDistanceCenter(false), aligned grid gap-3 with feed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-10T16:22:00Z
- **Completed:** 2026-08-10T16:24:33Z
- **Tasks:** 3 completed
- **Files modified:** 1

## Accomplishments

- Removed absolute-positioned `FavoriteButton` wrapper from favorites grid — single in-card heart per D-11/CARD-04
- Wired `distanceMeters` via `useDistanceCenter(false)` + `haversineKm` for browse/GPS/Venice center chain per D-23/CARD-02
- Changed favorites grid from `gap-space-md` to `gap-3` matching `FeedHomeClient` per D-26
- Preserved sync banner, empty state, auth modal, and `FAVORITES_CHANGE_EVENT` reload unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove duplicate FavoriteButton wrapper from favorites grid** - `3230b5d` (fix)
2. **Task 2: Wire favorites distanceMeters via useDistanceCenter + haversineKm** - `92a5a1d` (feat)
3. **Task 3: Align favorites grid gap to feed gap-3** - `4f40685` (fix)

**Plan metadata:** `3478910` (docs: complete plan)

## Files Created/Modified

- `components/listings/FavoritesPageClient.tsx` - Deduped heart, distance wiring, gap-3 grid

## Decisions Made

- Inline per-listing haversine in favorites map instead of `composeFeedListings` — favorites are not feed-filtered per D-30
- `useDistanceCenter(false)` keeps radius filtering off while center chain still resolves

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails on pre-existing TypeScript error in `lib/admin/cleanup.ts` (out of scope; webpack compile succeeded)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Favorites grid parity with feed complete; ready for Plan 04 (i18n Reserved suffix / remaining CARD items)
- Manual UAT recommended: open `/favorites` — single glass heart per card; distance · time when browse/GPS center active

## Self-Check: PASSED

- SUMMARY.md exists on disk
- FavoritesPageClient.tsx modified
- Task commits 3230b5d, 92a5a1d, 4f40685 found in git log

---
*Phase: 11-grid-listing-cards*
*Completed: 2026-08-10*
