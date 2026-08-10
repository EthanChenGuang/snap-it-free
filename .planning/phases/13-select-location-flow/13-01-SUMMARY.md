---
phase: 13-select-location-flow
plan: 01
subsystem: geo
tags: [sessionStorage, nearest-centroid, vitest, location-flow]

requires:
  - phase: 12-canonical-category-mapping
    provides: Wave-0 lib-before-tracer pattern precedent
provides:
  - lib/geo/resolve-city-label.ts shared Venice/Padova label resolver (D-16, D-27)
  - lib/post-draft/storage.ts sessionStorage CRUD for shoumanwu_post_draft (D-07, D-36)
affects:
  - 13-select-location-flow Plan 02 (SelectLocationClient + PostForm wiring)

tech-stack:
  added: []
  patterns:
    - Nearest-centroid squared-distance city label (ties favor Venice)
    - sessionStorage read/write/validate triad mirroring browse-center without cross-tab subscribe

key-files:
  created:
    - lib/geo/resolve-city-label.ts
    - lib/geo/resolve-city-label.test.ts
    - lib/post-draft/storage.ts
    - lib/post-draft/storage.test.ts
  modified: []

key-decisions:
  - "Partial post draft with valid lat/lng but missing locationConfirmed returns object with locationConfirmed false, not null — preloads pin position but blocks submit until re-confirmed"
  - "writePostDraft always persists locationConfirmed true regardless of caller input (D-36 single write path)"
  - "SelectLocationClient inline resolveCityLabel left untouched; Plan 02 swaps import"

patterns-established:
  - "Wave 0 lib-only TDD foundation before Plan 02 tracer wiring"
  - "Post-draft storage independent of shoumanwu_browse_center localStorage (D-07)"

requirements-completed: [LOC-01, LOC-02]

coverage:
  - id: D1
    description: "Shared resolveCityLabel with VENICE_CENTER export for nearest Venice/Padova city preview"
    requirement: LOC-01
    verification:
      - kind: unit
        ref: "lib/geo/resolve-city-label.test.ts#resolveCityLabel"
        status: pass
    human_judgment: false
  - id: D2
    description: "Post-draft sessionStorage CRUD on shoumanwu_post_draft independent of browse center"
    requirement: LOC-02
    verification:
      - kind: unit
        ref: "lib/post-draft/storage.test.ts#readPostDraft"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-10
status: complete
---

# Phase 13 Plan 01: Wave 0 Lib Foundation Summary

**Shared resolveCityLabel util and shoumanwu_post_draft sessionStorage CRUD with TDD — ready for Plan 02 component wiring**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-10T21:08:50Z
- **Completed:** 2026-08-10T21:10:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Promoted `resolveCityLabel` and `VENICE_CENTER` to `lib/geo/resolve-city-label.ts` with 4 unit tests (Venice, Padova, tie→Venice, center constant)
- Created `lib/post-draft/storage.ts` with `readPostDraft`/`writePostDraft` on `shoumanwu_post_draft` sessionStorage key, 8 unit tests covering round-trip, corrupt JSON, bounds validation, partial draft, and SSR guards
- All 12 phase-scoped tests pass via `npx vitest run lib/geo/resolve-city-label.test.ts lib/post-draft/storage.test.ts`

## Task Commits

Each task was committed atomically (TDD test → feat):

1. **Task 1: Promote resolveCityLabel to lib/geo/resolve-city-label.ts** - `7fac702` (test), `506afa2` (feat)
2. **Task 2: Create lib/post-draft/storage.ts** - `505f94d` (test), `99c375e` (feat)

## Files Created/Modified

- `lib/geo/resolve-city-label.ts` - Exports `VENICE_CENTER` and `resolveCityLabel` (nearest-centroid, ties favor Venice)
- `lib/geo/resolve-city-label.test.ts` - 4 tests for city label resolution and center constant
- `lib/post-draft/storage.ts` - sessionStorage CRUD with coordinate validation and D-36 write invariant
- `lib/post-draft/storage.test.ts` - 8 tests for read/write, partial draft, SSR, and bounds guards

## Decisions Made

- Partial draft resolution: valid coordinates with non-true `locationConfirmed` return `{ ...coords, locationConfirmed: false }` rather than null — aligns with D-10 preload + D-39 submit gate
- No cross-tab subscribe on post-draft storage (sessionStorage is single-tab per plan)
- `SelectLocationClient.tsx` inline copy intentionally left for Plan 02 import swap

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest in this project does not accept the `-x` fail-fast flag from PLAN.md verify blocks; ran without `-x` successfully

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can import `resolveCityLabel` + `VENICE_CENTER` from `@/lib/geo/resolve-city-label` and replace inline copy in `SelectLocationClient.tsx`
- Plan 02 post-confirm handler can call `writePostDraft`; `PostForm` can call `readPostDraft` on mount
- No blockers for Plan 02 tracer task

## Self-Check: PASSED

- FOUND: lib/geo/resolve-city-label.ts
- FOUND: lib/geo/resolve-city-label.test.ts
- FOUND: lib/post-draft/storage.ts
- FOUND: lib/post-draft/storage.test.ts
- FOUND: .planning/phases/13-select-location-flow/13-01-SUMMARY.md
- FOUND: 7fac702
- FOUND: 506afa2
- FOUND: 505f94d
- FOUND: 99c375e

---
*Phase: 13-select-location-flow*
*Completed: 2026-08-10*
