---
phase: 11-grid-listing-cards
plan: 01
subsystem: testing
tags: [vitest, card-metadata, formatDistance, tdd]

requires:
  - phase: 10-search-filter-sheet-distance
    provides: formatDistance pure function and distance pipeline (D-30 locked)
provides:
  - buildCardMetadata pure function for grid card metadata composition
  - Unit tests covering CARD-01, CARD-02, D-17, D-19 edge cases
  - Wave 0 Nyquist foundation unblocking Plans 02–04
affects: [11-02-PLAN, 11-03-PLAN, 11-04-PLAN, ListListingCard]

tech-stack:
  added: []
  patterns:
    - "Pure metadata builder in lib/listings/ consumed by ListListingCard (Plan 02)"
    - "TDD RED→GREEN with separate test/feat commits"

key-files:
  created:
    - lib/listings/card-metadata.ts
    - lib/listings/card-metadata.test.ts
  modified:
    - .planning/phases/11-grid-listing-cards/11-VALIDATION.md

key-decisions:
  - "Extract buildCardMetadata without removing inline function from ListListingCard — Plan 02 handles import swap"
  - "Reserved suffix only appended when isClaimed && reservedLabel non-empty per D-17 edge handling"

patterns-established:
  - "buildCardMetadata input object pattern with distanceMeters, cityLabel, postedLabel, isClaimed, reservedLabel"
  - "City omitted from output when distanceMeters present (D-16)"

requirements-completed: [CARD-01, CARD-02]

coverage:
  - id: D1
    description: "buildCardMetadata composes distance · time when meters present"
    requirement: CARD-02
    verification:
      - kind: unit
        ref: "lib/listings/card-metadata.test.ts#renders distance · time when meters present"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildCardMetadata composes city · time fallback when no distance"
    requirement: CARD-01
    verification:
      - kind: unit
        ref: "lib/listings/card-metadata.test.ts#renders city · time fallback when no distance"
        status: pass
    human_judgment: false
  - id: D3
    description: "Reserved suffix appended when claimed (D-17)"
    requirement: CARD-01
    verification:
      - kind: unit
        ref: "lib/listings/card-metadata.test.ts#appends reserved suffix when claimed"
        status: pass
    human_judgment: false
  - id: D4
    description: "No-coord claimed edge case — postedLabel · Reserved only (D-19)"
    requirement: CARD-01
    verification:
      - kind: unit
        ref: "lib/listings/card-metadata.test.ts#handles claimed + no city + no distance"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-10
status: complete
---

# Phase 11 Plan 01: Card Metadata TDD Foundation Summary

**Pure buildCardMetadata helper with 7 unit tests covering distance · time, city · time fallback, and claimed Reserved suffix**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-10T16:18:30Z
- **Completed:** 2026-08-10T16:21:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extracted `buildCardMetadata` to `lib/listings/card-metadata.ts` with `BuildCardMetadataInput` type
- 7 unit tests covering CARD-01, CARD-02, D-16, D-17, D-19 edge cases
- Wave 0 validation sign-off — `wave_0_complete: true`, task 11-01-01 marked green
- Plans 02–04 unblocked to import tested metadata builder

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: add failing tests** - `0e259fb` (test)
2. **Task 1 GREEN: extract buildCardMetadata** - `e720705` (feat)
3. **Task 2: Wave 0 validation sign-off** - `7a4fa28` (docs)

## Files Created/Modified
- `lib/listings/card-metadata.ts` - Pure metadata composer using formatDistance
- `lib/listings/card-metadata.test.ts` - 7 test cases for all CARD/D decision paths
- `.planning/phases/11-grid-listing-cards/11-VALIDATION.md` - Wave 0 complete sign-off

## Decisions Made
- Inline `buildCardMetadata` left in `ListListingCard.tsx` per plan — Plan 02 replaces with import
- Empty `reservedLabel` when claimed returns base string without trailing separator

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing failures in `lib/admin/subito-regalo-catalog.test.ts` (3 tests) cause full `npm run test:lib` to exit non-zero; out of scope for Phase 11 Plan 01. New card-metadata tests (7/7) pass independently.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can import `buildCardMetadata` into `ListListingCard` and remove inline duplicate
- `formatDistance` pipeline untouched per D-30

## Self-Check: PASSED
- FOUND: lib/listings/card-metadata.ts
- FOUND: lib/listings/card-metadata.test.ts
- FOUND: .planning/phases/11-grid-listing-cards/11-01-SUMMARY.md
- FOUND: 0e259fb
- FOUND: e720705
- FOUND: 7a4fa28

---
*Phase: 11-grid-listing-cards*
*Completed: 2026-08-10*
