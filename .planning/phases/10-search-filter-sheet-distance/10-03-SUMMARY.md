---
phase: 10-search-filter-sheet-distance
plan: 03
subsystem: ui
tags: [filter-sheet, haversine, pills, useDistanceCenter, radius-slider]

requires:
  - 10-02
provides:
  - useDistanceCenter hook with browse → GPS → Venice fallback chain
  - Full FeedHomeClient filter pipeline with distanceMap
  - FilterSheet radius toggle + 1–50 km slider
  - Full dismissible active pills row (search/center/radius/city/categories)
affects: [10-04, 10-05]

tech-stack:
  added: []
  patterns:
    - composeFeedListings pipeline order search → radius → city → categories → sort
    - One-shot getCurrentPosition with PostForm geo options (D-10)
    - SettingsToggle + native range for radius control (D-58)

key-files:
  created:
    - hooks/useDistanceCenter.ts
    - hooks/useDistanceCenter.test.ts
  modified:
    - components/listings/FeedHomeClient.tsx
    - components/listings/FilterSheet.tsx
    - components/listings/ListListingCard.tsx
    - components/shell/FeedFilterContext.tsx
    - components/shell/FeedHeaderRow.tsx
    - messages/en.ts
    - messages/zh.ts
    - messages/it.ts
    - vitest.config.ts

key-decisions:
  - "composeFeedListings exported from useDistanceCenter module for testable D-29 pipeline"
  - "Center pill shown only for browse or GPS sources; Venice default fallback has no pill"
  - "distanceMeters prop on ListListingCard reserved for Plan 04 card metadata"

patterns-established:
  - "Pill order locked: Search → Center → Radius → City → Categories with shared PILL_CLASS"
  - "dismissCategory/dismissRadius write applied prefs immediately (not draft flow)"

requirements-completed: [FILT-01, FILT-02, FILT-03, FILT-05]

coverage:
  - id: D1
    description: useDistanceCenter resolves browse → GPS → Venice default priority
    requirement: FILT-05
    verification:
      - kind: unit
        ref: hooks/useDistanceCenter.test.ts#resolveDistanceCenter
        status: pass
    human_judgment: false
  - id: D2
    description: Feed pipeline excludes no-coord when radius ON, includes when OFF
    requirement: FILT-05
    verification:
      - kind: unit
        ref: hooks/useDistanceCenter.test.ts#composeFeedListings pipeline
        status: pass
    human_judgment: false
  - id: D3
    description: FilterSheet radius range 1–50 km with enable toggle
    requirement: FILT-01
    verification:
      - kind: other
        ref: grep FilterSheet.tsx type=range min=1 max=50
        status: pass
    human_judgment: false
  - id: D4
    description: Full dismissible pills row with withinKm radius label
    requirement: FILT-03
    verification:
      - kind: other
        ref: components/shell/FeedHeaderRow.tsx#FeedActiveFilterPills
        status: pass
    human_judgment: true
    rationale: Visual pill order and dismiss behavior need manual feed QA

duration: 12min
completed: 2026-08-10
status: complete
---

# Phase 10 Plan 03: Full Filter System Summary

**useDistanceCenter hook, haversine filter pipeline, radius slider in FilterSheet, and full dismissible active pills row**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-10T13:06:00Z
- **Completed:** 2026-08-10T13:18:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- `useDistanceCenter` resolves center browse → one-shot GPS → Venice default (45.44, 12.33)
- `FeedHomeClient` pipeline: search → radius → city → categories → nearest-first sort; builds `distanceMap`
- `FilterSheet` radius toggle + 1–50 km slider; category checklist with clear selection
- `FeedHeaderRow` pills: search, center, radius (withinKm), city, per-category — all dismissible with flex-wrap
- `FeedFilterContext` adds `dismissCategory` and `dismissRadius`

## Task Commits

Each task was committed atomically:

1. **Task 1 RED:** useDistanceCenter tests - `a0d3a80`
2. **Task 1 GREEN:** useDistanceCenter hook + FeedHomeClient pipeline - `5cf11fa`
3. **Task 2:** FilterSheet radius + category sections - `d9b06a5`
4. **Task 3:** Full active pills row - `52aea9f`

## Files Created/Modified

- `hooks/useDistanceCenter.ts` — Center resolution + composeFeedListings pipeline helper
- `hooks/useDistanceCenter.test.ts` — resolveDistanceCenter and pipeline unit tests
- `components/listings/FeedHomeClient.tsx` — Full D-29 filter composition + distanceMap
- `components/listings/FilterSheet.tsx` — Radius toggle/slider; clear selection link
- `components/shell/FeedHeaderRow.tsx` — Full pills row per D-66–70
- `components/shell/FeedFilterContext.tsx` — dismissCategory, dismissRadius
- `messages/{zh,en,it}.ts` — withinKm, myLocation, clearSelection, radius enable strings

## Decisions Made

- Center pill omitted when only Venice default fallback active (no user-confirmed or GPS center)
- `distanceMeters` passed to cards but metadata rendering deferred to Plan 10-04

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added hooks/**/*.test.ts to vitest.config.ts**
- **Found during:** Task 1 verification
- **Issue:** hooks/useDistanceCenter.test.ts not in vitest include glob
- **Fix:** Extended vitest include array
- **Files modified:** vitest.config.ts
- **Committed in:** a0d3a80

None otherwise — plan executed as written.

## Known Stubs

| File | Description | Future Plan |
|------|-------------|-------------|
| `components/listings/ListListingCard.tsx` | `distanceMeters` prop accepted but not rendered in metadata | 10-04 |
| `components/shell/FeedHeaderRow.tsx` | Center pill × clears browse center + GPS refetch; full D-12 chain in 10-04 | 10-04 |

## Issues Encountered

- `npm run build` fails on pre-existing `lib/admin/cleanup.ts` type error (unchanged from Plan 02)
- `lib/admin/subito-regalo-catalog.test.ts` has 3 pre-existing failures unrelated to this plan

## User Setup Required

None.

## Next Phase Readiness

- Plan 10-04 can wire card distance metadata, select-location center sync, and center pill polish
- Full filter composition operational for manual QA

## Self-Check: PASSED

- hooks/useDistanceCenter.ts: FOUND
- hooks/useDistanceCenter.test.ts: FOUND
- components/listings/FilterSheet.tsx: FOUND
- components/shell/FeedHeaderRow.tsx: FOUND
- Commits a0d3a80, 5cf11fa, d9b06a5, 52aea9f: FOUND

---
*Phase: 10-search-filter-sheet-distance*
*Completed: 2026-08-10*
