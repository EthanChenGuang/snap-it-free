---
phase: 10-search-filter-sheet-distance
plan: 04
subsystem: ui
tags: [distance-metadata, browse-center, city-only, feed-search, select-location]

requires:
  - 10-03
provides:
  - Grid card distance · time metadata with smart metric units
  - Pan-only select-location with city-level confirm labels
  - City-only feed search matching (Venice/Padova, not zones)
  - Browse center clear → GPS refetch chain in useDistanceCenter
affects: [10-05, 11]

tech-stack:
  added: []
  patterns:
    - listingConsumerCityLabel shared between cards and feed-search (D-38)
    - Card metadata formatDistance · formatRelativeTime when center active (D-61)
    - Select-location confirm writes city trilingual label only (D-01/D-32)

key-files:
  created: []
  modified:
    - components/listings/ListListingCard.tsx
    - components/listings/FeedHomeClient.tsx
    - components/map/SelectLocationClient.tsx
    - hooks/useDistanceCenter.ts
    - lib/listings/feed-search.ts
    - lib/listings/feed-search.test.ts
    - hooks/useDistanceCenter.test.ts

key-decisions:
  - "Card metadata uses consumer city keys when distance unavailable; never zone subdivisions"
  - "Select-location confirm label derived from nearest city (Venice vs Padova) not zone chips"
  - "FeedHeaderRow center pill wiring retained from Plan 03; GPS refetch on browse clear added to hook"

patterns-established:
  - "matchesFeedSearch accepts ConsumerCityLabels instead of zoneLabel"
  - "distanceMap recomputes in composeFeedListings useMemo keyed on center (D-64)"

requirements-completed: [FILT-04, FILT-05, I18N-01]

coverage:
  - id: D1
    description: ListListingCard shows distance · time when center active and listing has coords
    requirement: FILT-05
    verification:
      - kind: unit
        ref: lib/geo/format-distance.test.ts
        status: pass
      - kind: unit
        ref: lib/listings/filters.test.ts
        status: pass
    human_judgment: true
    rationale: Visual card metadata layout needs manual feed QA
  - id: D2
    description: Select-location pan-only with city-level confirm label
    requirement: FILT-04
    verification:
      - kind: other
        ref: grep SelectLocationClient no SelectLocationZoneChips
        status: pass
    human_judgment: true
    rationale: Map confirm flow and label display need manual QA
  - id: D3
    description: Feed search matches city names not zone subdivisions
    requirement: FILT-04
    verification:
      - kind: unit
        ref: lib/listings/feed-search.test.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Center pill dismiss clears browse center and refetches GPS
    requirement: FILT-05
    verification:
      - kind: other
        ref: components/shell/FeedHeaderRow.tsx clearBrowseCenter + hooks/useDistanceCenter.ts browse-clear effect
        status: pass
    human_judgment: true
    rationale: D-12 fallback chain requires device geolocation manual check

duration: 8min
completed: 2026-08-10
status: complete
---

# Phase 10 Plan 04: Distance Metadata & City-Only Labels Summary

**Grid cards show distance · time metadata, select-location is pan-only with city labels, and feed search matches Venice/Padova not zones**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-10T13:10:00Z
- **Completed:** 2026-08-10T13:18:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `ListListingCard` renders `{distance} · {time}` via `formatDistance` when `distanceMeters` present; city-only fallback per D-38/D-63
- `SelectLocationClient` zone chips removed; Confirm saves city-level trilingual label and navigates home for immediate re-filter (D-07/D-20/D-32)
- `feed-search` uses `listingConsumerCityLabel` — Venice zone listings match "Venice" not "Historic Center"
- `useDistanceCenter` refetches GPS when browse center cleared (D-12); center pill dismiss chain complete from Plan 03

## Task Commits

Each task was committed atomically:

1. **Task 1: ListListingCard distance · time metadata line** - `7212b3a` (feat)
2. **Task 2: SelectLocationClient remove zone chips + city confirm** - `f97bb3f` (feat)
3. **Task 3: Center pill wiring + feed-search city-only labels** - `d03089c` (feat)

## Files Created/Modified

- `components/listings/ListListingCard.tsx` — Distance · time metadata + consumer city labels
- `components/listings/FeedHomeClient.tsx` — Passes distanceMeters from distanceMap
- `components/map/SelectLocationClient.tsx` — Pan-only map, city confirm label
- `lib/listings/feed-search.ts` — City-only search labels via listingConsumerCity
- `lib/listings/feed-search.test.ts` — Venice/Padova match tests; zone name rejection
- `hooks/useDistanceCenter.ts` — cityLabels param; GPS refetch on browse clear
- `hooks/useDistanceCenter.test.ts` — Updated composeFeedListings cityLabels

## Decisions Made

- Reused FeedHeaderRow center pill from Plan 03; enhanced hook for D-12 GPS refetch on external browse clear
- Select-location city label uses squared-distance nearest city (Venice vs Padova centers)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails on pre-existing `lib/admin/cleanup.ts` type error (unchanged from Plans 02–03)
- `lib/admin/subito-regalo-catalog.test.ts` has 3 pre-existing failures unrelated to this plan
- Vitest `-x` bail flag not supported in project vitest version; ran full targeted test files instead

## User Setup Required

None.

## Next Phase Readiness

- Plan 10-05 can proceed with remaining phase items
- Phase 11 can polish card layout reusing distance pipeline per D-65

## Self-Check: PASSED

- components/listings/ListListingCard.tsx: FOUND
- components/map/SelectLocationClient.tsx: FOUND
- lib/listings/feed-search.ts: FOUND
- hooks/useDistanceCenter.ts: FOUND
- Commits 7212b3a, f97bb3f, d03089c: FOUND

---
*Phase: 10-search-filter-sheet-distance*
*Completed: 2026-08-10*
