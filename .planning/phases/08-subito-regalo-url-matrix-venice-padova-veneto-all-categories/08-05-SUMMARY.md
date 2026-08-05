---
phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
plan: 05
subsystem: ui
tags: [subito, category-filters, padova, d-22, d-29, d-30, stitch]

requires:
  - phase: 08-02
    provides: listings_public view with city/region/category columns
  - phase: 08-03
    provides: ingest pipeline persisting category slug and Padova coords
provides:
  - SubitoCategoryFilterChips shared on map and Elenco
  - filterByZone D-22 All includes zone-null+coords Padova rows
  - matchesSubitoCategory and resolveListingCategory (D-29/D-31)
  - ListingCard and ListListingCard city/category badges (D-27)
affects:
  - phase-08-verification
  - consumer-browsing

tech-stack:
  added: []
  patterns:
    - "DB category slug primary; title inference fallback only"
    - "Zone Tutte OR (zone-null AND lat/lng) for Padova visibility"

key-files:
  created:
    - components/listings/SubitoCategoryFilterChips.tsx
    - lib/listings/subito-categories.ts
  modified:
    - lib/listings/filters.ts
    - lib/i18n/listing-fields.ts
    - components/map/FloatingMapSearch.tsx
    - components/map/MapExplorer.tsx
    - components/listings/ListingCard.tsx
    - components/listings/ListPageClient.tsx
    - components/listings/ListListingCard.tsx
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts

key-decisions:
  - "SubitoCategoryFilterChips shared between map panel and Elenco inline variants"
  - "resolveListingCategory delegates to getSubitoCategoryLabel for i18n consistency"

patterns-established:
  - "Consumer category filter: matchesSubitoCategory(listing, slug | 'all') after filterByZone"
  - "Location line: zoneLabel(zone) when zoned; capitalize city when zone null (D-27)"

requirements-completed: [SCRP-01 (extended)]

coverage:
  - id: D1
    description: "filterByZone All includes Padova zone-null rows with lat/lng (D-22)"
    requirement: "SCRP-01 (extended)"
    verification:
      - kind: unit
        ref: "lib/listings/filters.test.ts#returns zoned listings and zone-null rows with coords when zone is All"
        status: pass
    human_judgment: false
  - id: D2
    description: "matchesSubitoCategory prefers DB category slug over title inference (D-29)"
    requirement: "SCRP-01 (extended)"
    verification:
      - kind: unit
        ref: "lib/listings/subito-categories.test.ts#prefers listing.category DB slug over title inference"
        status: pass
    human_judgment: false
  - id: D3
    description: "18 Subito category chips on map and Elenco (D-30)"
    requirement: "SCRP-01 (extended)"
    verification:
      - kind: unit
        ref: "lib/listings/subito-categories.test.ts"
        status: pass
    human_judgment: true
    rationale: "Visual Stitch compliance and chip scroll behavior require manual map/Elenco check"
  - id: D4
    description: "Padova listing visible in Elenco at Tutte with Informatica badge"
    requirement: "SCRP-01 (extended)"
    verification: []
    human_judgment: true
    rationale: "Requires migration 020 applied and live Padova ingest; SUPABASE env not configured in executor environment"

duration: 3min
completed: 2026-08-05
status: complete
---

# Phase 08 Plan 05: Subito Category Filters Summary

**Subito 18-chip category filters on map and Elenco with D-22 zone All Padova visibility, DB-backed category badges, and i18n resolveListingCategory**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-05T17:53:00Z
- **Completed:** 2026-08-05T17:56:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- `filterByZone('All')` now includes Venice-zoned listings plus zone-null rows with lat/lng (Padova pins/list rows per D-22)
- Shared `SubitoCategoryFilterChips` (Tutte + 17 slugs) on map frosted panel and Elenco feed
- `matchesSubitoCategory` and `resolveListingCategory` prefer DB `listing.category` slug; title inference fallback only
- `ListingCard` and `ListListingCard` show category badge and city label (e.g. Padova) when zone is null (D-27)
- Empty state copy updated per 08-UI-SPEC Screen 4

## Task Commits

1. **Task 1: filterByZone D-22 + subito-categories helpers** — `5430c76` (test), `0584eae` (feat)
2. **Task 2: SubitoCategoryFilterChips + map integration** — `dbe0860` (feat)
3. **Task 3: Elenco ListPageClient + ListListingCard badges** — `517b106` (feat)

## Files Created/Modified

- `lib/listings/subito-categories.ts` — getSubitoCategoryLabel, matchesSubitoCategory, SUBITO_CATEGORY_SLUGS
- `lib/listings/filters.ts` — D-22 filterByZone All branch
- `lib/i18n/listing-fields.ts` — resolveListingCategory (D-31)
- `components/listings/SubitoCategoryFilterChips.tsx` — shared 18-chip filter (inline + panel variants)
- `components/map/FloatingMapSearch.tsx` — category panel Row 2 below zone chips
- `components/map/MapExplorer.tsx` — selectedCategory state + AND filter pipeline
- `components/listings/ListingCard.tsx` — category badge + zone/city location line
- `components/listings/ListPageClient.tsx` — SubitoCategoryFilterChips + DB category filter
- `components/listings/ListListingCard.tsx` — image badge + city location line
- `messages/{zh,en,it}.ts` — empty state copy per UI-SPEC

## Decisions Made

- SubitoCategoryFilterChips uses `variant="panel"` on map (frosted Categoria wrapper) and `inline` on Elenco
- Category badge styling: Venice zoned → `bg-[#f1f1f0]`; Padova/city-only → `bg-surface-container-high`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails on pre-existing type error in `lib/admin/cleanup.ts` (unrelated to this plan); all plan-specific unit tests pass (29/29 filter+category+i18n)

## Phase E2E Verification Notes

With migration 020 applied and a Padova listing ingested (Plan 03) at category `informatica`:
- Elenco at Tutte should show the Padova row with Informatica badge and city label "Padova"
- Map at Tutte + pan west should show Padova pin
- Live verification blocked: SUPABASE env not configured in executor environment

## Next Phase Readiness

- Consumer category filter UI complete; phase gate depends on live Padova ingest + admin seed (Plans 01–04)
- Manual UAT recommended for map category panel scroll and combined zone+category filtering

## Self-Check: PASSED

- FOUND: components/listings/SubitoCategoryFilterChips.tsx
- FOUND: lib/listings/subito-categories.ts
- FOUND: .planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-05-SUMMARY.md
- FOUND: 5430c76, 0584eae, dbe0860, 517b106

---
*Phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories*
*Completed: 2026-08-05*
