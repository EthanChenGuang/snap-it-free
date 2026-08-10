---
phase: 12-canonical-category-mapping
plan: 03
subsystem: api
tags: [zod, ugc, postCategory, canonical-categories, CAT-02]

requires:
  - phase: 12-canonical-category-mapping
    plan: 01
    provides: mapPostCategoryToSlug and PostCategory type in canonical module
  - phase: 12-canonical-category-mapping
    plan: 02
    provides: filter/display resolver adoption baseline
provides:
  - CreateListingSchema postCategory enum validation at API boundary
  - UGC insert persists listing.category via server-side slug mapping
  - PostForm sends postCategory in JSON; UI labels unchanged (D-12)
affects: [12-04-PLAN, feed category filters, UGC create flow]

tech-stack:
  added: []
  patterns: [client sends PostCategory enum only; server maps to Subito slug at insert; POST_CATEGORIES exported for DRY]

key-files:
  created: []
  modified:
    - lib/listings/canonical-categories.ts
    - lib/ugc/schemas.ts
    - lib/ugc/schemas.test.ts
    - app/api/ugc/listings/route.ts
    - components/ugc/PostForm.tsx

key-decisions:
  - "POST_CATEGORIES derived from POST_CATEGORY_TO_SLUG keys for zod enum and PostForm picker"
  - "No raw category slug field on create schema — V5 tampering mitigation"
  - "buildDescription category metadata preserved for human-readable descriptions"

patterns-established:
  - "Pattern: UGC write path accepts postCategory enum only; mapPostCategoryToSlug at insert"
  - "Pattern: PostCategory type single-sourced from canonical-categories.ts"

requirements-completed: [CAT-02, I18N-01]

coverage:
  - id: D1
    description: "CreateListingSchema requires postCategory enum; rejects missing and raw slug"
    requirement: CAT-02
    verification:
      - kind: unit
        ref: "lib/ugc/schemas.test.ts#CreateListingSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "POST /api/ugc/listings persists category via mapPostCategoryToSlug"
    requirement: CAT-02
    verification:
      - kind: other
        ref: "grep mapPostCategoryToSlug app/api/ugc/listings/route.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "PostForm sends postCategory; six category picker labels unchanged"
    requirement: I18N-01
    verification:
      - kind: other
        ref: "grep postCategory components/ugc/PostForm.tsx && grep messages.post.categories"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-10
status: complete
---

# Phase 12 Plan 03: UGC Write Path Category Persistence Summary

**UGC create validates PostCategory enum and persists canonical Subito slug in listing.category at insert**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-10T18:37:00Z
- **Completed:** 2026-08-10T18:39:36Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Extended CreateListingSchema with required postCategory zod enum sourced from canonical module
- UGC POST route maps postCategory to catalog slug on insert; never reads raw slug from body
- PostForm imports PostCategory/POST_CATEGORIES from canonical module; sends postCategory in JSON

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend CreateListingSchema with postCategory enum** - `b08bdfc` (test), `3a440d0` (feat)
2. **Task 2: API insert persists category slug from postCategory** - `70edc2e` (feat)
3. **Task 3: PostForm wire postCategory — UI labels unchanged** - `6a67fc7` (feat)

## Files Created/Modified

- `lib/listings/canonical-categories.ts` - Exported POST_CATEGORIES array for DRY enum/picker
- `lib/ugc/schemas.ts` - Required postCategory field on CreateListingSchema
- `lib/ugc/schemas.test.ts` - TDD tests for enum validation and V5 raw-slug rejection
- `app/api/ugc/listings/route.ts` - category column on insert via mapPostCategoryToSlug
- `components/ugc/PostForm.tsx` - postCategory in create JSON; removed duplicate local type

## Decisions Made

- POST_CATEGORIES derived from POST_CATEGORY_TO_SLUG Object.keys for single source of truth
- z.object strips unknown keys so raw `category` slug fails via missing postCategory (V5)
- buildDescription category embedding unchanged for human-readable listing descriptions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run test:lib -- <file> -x` fails (vitest unknown `-x` option); ran without `-x`. Targeted schema and canonical-categories tests pass. Pre-existing subito-regalo-catalog.test.ts failures unrelated.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 integration audit and full verification unblocked
- New UGC posts participate in category filters without description parsing (CAT-02)
- Existing rows without category column continue inference at filter time (D-13)

---
*Phase: 12-canonical-category-mapping*
*Completed: 2026-08-10*

## Self-Check: PASSED

- lib/ugc/schemas.ts — FOUND
- app/api/ugc/listings/route.ts — FOUND
- components/ugc/PostForm.tsx — FOUND
- Commits b08bdfc, 3a440d0, 70edc2e, 6a67fc7 — FOUND
