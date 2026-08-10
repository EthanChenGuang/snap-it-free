---
phase: 10-search-filter-sheet-distance
plan: 02
subsystem: ui
tags: [filter-sheet, city-filter, feed-filter-context, vaul-drawer, d-01]

requires:
  - 10-01
provides:
  - FeedFilterContext with applied/draft filter state
  - FilterSheet bottom drawer with city and category sections
  - City filter E2E tracer path Venice → Apply → feed + pill
  - Category state migrated off FeedScrollContext
affects: [10-03, 10-04, 10-05]

tech-stack:
  added: []
  patterns:
    - useSyncExternalStore for filter prefs hydrate (mirrors browse-center)
    - Draft/Apply semantics with resetDraftFromApplied on dismiss
    - City-only consumer filter All · Venice · Padova per D-01

key-files:
  created:
    - components/shell/FeedFilterContext.tsx
    - components/listings/FilterSheet.tsx
    - .planning/phases/10-search-filter-sheet-distance/10-02-D01-DECISION.md
  modified:
    - components/shell/AppChrome.tsx
    - components/shell/FeedScrollContext.tsx
    - components/shell/FeedHeaderRow.tsx
    - components/listings/FeedHomeClient.tsx
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts

key-decisions:
  - "D-01 proceed-city-only: consumer UI shows All · Venice · Padova only — zone names retired"
  - "Filter stub toast replaced with Vaul FilterSheet per D-59"
  - "Categories migrated to FeedFilterContext multi-select array per D-50"

patterns-established:
  - "FeedFilterProvider nests inside AppChrome feed branch wrapping FeedScrollProvider"
  - "City pill dismissible below search row; filter icon dot when hasActiveFilters"

requirements-completed: [FILT-01, FILT-02, FILT-04]

coverage:
  - id: D1
    description: D-01 city-only decision recorded and implemented
    requirement: FILT-04
    verification:
      - kind: grep
        ref: components/listings/FilterSheet.tsx#ConsumerCityChipSelector
        status: pass
    human_judgment: true
  - id: D2
    description: Filter sheet opens instead of filterComingSoon toast
    requirement: FILT-01
    verification:
      - kind: grep
        ref: components/shell/FeedHeaderRow.tsx#setSheetOpen
        status: pass
    human_judgment: false
  - id: D3
    description: Venice city filter applies via matchesConsumerCity pipeline
    requirement: FILT-04
    verification:
      - kind: grep
        ref: components/listings/FeedHomeClient.tsx#matchesConsumerCity
        status: pass
    human_judgment: false
  - id: D4
    description: Draft prefill on open and discard on close without Apply
    requirement: FILT-02
    verification:
      - kind: unit
        ref: lib/filter-prefs/storage.test.ts
        status: pass
    human_judgment: true

duration: 8min
completed: 2026-08-10
status: complete
---

# Phase 10 Plan 02: Filter Sheet City Filter Tracer Summary

**FeedFilterContext + FilterSheet with city-only All · Venice · Padova filter, E2E tracer path, and category state migration off FeedScrollContext**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-10T13:04:00Z
- **Completed:** 2026-08-10T13:12:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- D-01 checkpoint resolved: proceed-city-only — zone names retired from consumer filter UI
- `FeedFilterContext` holds applied/draft filters with `shoumanwu_filter_prefs` localStorage hydrate
- `FilterSheet` Vaul drawer with Radius stub, City chips, Categories checklist, Reset/Apply footer
- Filter button opens sheet (stub toast removed); dot badge when filters active
- Venice/Padova city filter applies to feed via `matchesConsumerCity`; dismissible city pill
- `selectedCategory` removed from `FeedScrollContext`; categories in filter prefs array

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm city-only consumer filter (D-01)** - `c66671e`
2. **Task 2: End-to-end city filter tracer** - `1e1d887`
3. **Task 3: Draft prefill and filter dot badge polish** - `2bf9f44`

## Files Created/Modified

- `components/shell/FeedFilterContext.tsx` — Applied/draft filter state provider
- `components/listings/FilterSheet.tsx` — Stitch monochrome filter bottom sheet
- `components/shell/FeedHeaderRow.tsx` — Sheet open, dot badge, city pill
- `components/listings/FeedHomeClient.tsx` — City + multi-category filter pipeline
- `components/shell/AppChrome.tsx` — FeedFilterProvider nest
- `components/shell/FeedScrollContext.tsx` — Category state removed
- `messages/{zh,en,it}.ts` — Filter sheet i18n keys; filterComingSoon removed

## Decisions Made

- D-01 proceed-city-only supersedes FILT-04 zone-chip UX (documented in 10-02-D01-DECISION.md)
- Radius section stubbed with placeholder copy — full slider in Plan 10-03

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Deferred / Out-of-Scope

- `npm run build` fails on pre-existing `lib/admin/cleanup.ts` type error (unrelated to this plan)
- `npm run test:lib` has 3 pre-existing failures in `lib/admin/subito-regalo-catalog.test.ts`

## Known Stubs

| File | Description | Future Plan |
|------|-------------|-------------|
| `components/listings/FilterSheet.tsx` | Radius section shows placeholder text only | 10-03 |

## Manual QA Notes (D-53)

Close-without-Apply flow: change city in draft → swipe close or tap overlay → reopen sheet → draft matches last applied state, not abandoned edit.

## User Setup Required

None.

## Next Phase Readiness

- Tracer path committed — Plan 10-03 can expand radius slider, full pills row, and filter pipeline
- Wave 1 gate satisfied for city filter architecture

## Self-Check: PASSED

- components/shell/FeedFilterContext.tsx: FOUND
- components/listings/FilterSheet.tsx: FOUND
- Commits c66671e, 1e1d887, 2bf9f44: FOUND

---
*Phase: 10-search-filter-sheet-distance*
*Completed: 2026-08-10*
