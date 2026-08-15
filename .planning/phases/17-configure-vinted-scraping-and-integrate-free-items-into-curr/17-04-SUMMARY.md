---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
plan: 04
subsystem: listings
tags: [vinted, categories, canonical-slug, subito-regalo, filter-pipeline, tdd]
requires:
  - phase: 17
    plan: 03
    provides: enrich catalog_id from item detail, vinted crawler live path
provides:
  - VINTED_CATALOG_TO_SUBITO_SLUG mapping table with Wave 0 + research IDs
  - resolveCanonicalCategorySlug source=vinted branch (map → inference → null)
  - Persist-time category slug assignment in normalizeVintedRawListing
  - Vinted category resolver unit tests in canonical-categories.test.ts
affects:
  - 17-05 (admin seed URLs reference same catalog IDs)
  - 17-07 (verification grep for vinted resolver branch)

tech-stack:
  added: []
  patterns:
    - Vinted catalog_id → Subito regalo slug many-to-one map (D-17-24)
    - Single filter pipeline via resolveCanonicalCategorySlug for source=vinted (CAT-01)
    - Scraper persist imports map without @/lib transitive deps

key-files:
  created:
    - lib/listings/vinted-category-map.ts
  modified:
    - lib/listings/canonical-categories.ts
    - lib/listings/canonical-categories.test.ts
    - scraper/src/vinted/normalize.ts
    - scraper/src/vinted/normalize.test.ts
    - scraper/src/vinted/enrich.ts
    - scraper/src/subito/extract.ts

key-decisions:
  - "D-17-17 option-a: Add vinted branch in resolveCanonicalCategorySlug (map → inference → null)"
  - "D-17-21 option-a: FilterSheet unchanged — Vinted matches via persisted canonical slug only"
  - "Scraper normalize uses vinted-category-map + categories.js directly (no @/lib canonical-categories import)"

patterns-established:
  - "Unmapped Vinted catalog_id returns null — never forced usato catch-all (D-17-18)"
  - "vinted-category-map.ts avoids @/ imports so scraper tsx runtime can load at persist"

requirements-completed: [CAT-01, CAT-03, D-17-16, D-17-17, D-17-18, D-17-20, D-17-21, D-17-24]

coverage:
  - id: D1
    description: "resolveCanonicalCategorySlug handles source=vinted with map → inference → null"
    requirement: CAT-01
    verification:
      - kind: unit
        ref: "lib/listings/canonical-categories.test.ts#vinted source cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "VINTED_CATALOG_TO_SUBITO_SLUG documented and unit-tested"
    requirement: CAT-03
    verification:
      - kind: unit
        ref: "lib/listings/canonical-categories.test.ts#mapVintedCatalogToSlug(1918)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unmapped Vinted catalog ID returns null — not usato"
    requirement: D-17-18
    verification:
      - kind: unit
        ref: "lib/listings/canonical-categories.test.ts#returns null for unmapped Vinted"
        status: pass
    human_judgment: false
  - id: D4
    description: "normalizeVintedRawListing persists canonical category from catalog_id"
    requirement: D-17-16
    verification:
      - kind: unit
        ref: "scraper/src/vinted/normalize.test.ts#persists canonical category slug"
        status: pass
    human_judgment: false
  - id: D5
    description: "FilterSheet unchanged — zero diff in plan commits"
    requirement: D-17-21
    verification:
      - kind: other
        ref: "grep FilterSheet — no files under components/FilterSheet in 17-04 commits"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-15
status: complete
---

# Phase 17 Plan 04: Vinted Category Integration Summary

**Vinted catalog_id → Subito regalo slug map with resolver branch and persist-time category assignment — FilterSheet unchanged**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-15T14:14:00Z
- **Completed:** 2026-08-15T14:17:00Z
- **Tasks:** 3 (2 decision checkpoints + 1 TDD implementation)
- **Files modified:** 7

## Accomplishments

- Created `VINTED_CATALOG_TO_SUBITO_SLUG` with Wave 0 verified IDs (1918, 3474, 3584), research table entries, and best-effort TBD parent IDs with operator-tuning comments (CAT-03, D-17-20/24)
- Extended `resolveCanonicalCategorySlug` with `source === 'vinted'` branch: DB slug → map → title inference → null — never usato (CAT-01, D-17-17/18)
- Wired `normalizeVintedRawListing` to persist canonical category slug from enriched `catalog_id` at scrape time (D-17-16)
- Confirmed FilterSheet untouched — Vinted listings match existing 17 Subito slug filters via resolver only (D-17-21)

## Task Commits

1. **Task 1: Confirm resolver extension for vinted source (D-17-17)** — option-a recorded; no code commit
2. **Task 2: Confirm FilterSheet unchanged contract (D-17-21)** — option-a recorded; no code commit
3. **Task 3: Vinted→Subito map, resolver branch, normalize wiring, tests** — `16a9f39` (test) + `a872bab` (feat)

**Plan metadata:** `9ed1ce1` (docs: complete plan)

## Files Created/Modified

- `lib/listings/vinted-category-map.ts` — VINTED_CATALOG_TO_SUBITO_SLUG + mapVintedCatalogToSlug (CAT-03)
- `lib/listings/canonical-categories.ts` — vintedCatalogId input + vinted resolver branch
- `lib/listings/canonical-categories.test.ts` — map hit, DB precedence, inference, unmapped null, many-to-one apparel
- `scraper/src/vinted/normalize.ts` — resolveVintedCategorySlug at persist (scraper-safe imports)
- `scraper/src/vinted/enrich.ts` — catalog_id on enriched RawListing
- `scraper/src/subito/extract.ts` — optional catalog_id on RawListing type

## Decisions Made

- **D-17-17 option-a:** Central resolver vinted branch — map → inference → null
- **D-17-21 option-a:** No FilterSheet changes; integration via persisted canonical slug only
- **Scraper import path:** normalize imports `vinted-category-map.js` + `categories.js` directly (avoids `@/lib` in scraper runtime)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scraper-safe category resolution imports**
- **Found during:** Task 3 (normalize wiring)
- **Issue:** `canonical-categories.ts` uses `@/lib/admin/subito-regalo-catalog` — scraper tsx cannot resolve at runtime
- **Fix:** `vinted-category-map.ts` uses no `@/` imports; normalize mirrors INFERRED map locally with sync comment; imports map + inferListingCategory directly
- **Files modified:** lib/listings/vinted-category-map.ts, scraper/src/vinted/normalize.ts
- **Verification:** scraper/src/vinted/normalize.test.ts 5/5 pass
- **Committed in:** a872bab

**2. [Rule 2 - Missing Critical] catalog_id on RawListing from enrich**
- **Found during:** Task 3 (persist wiring)
- **Issue:** catalog_id only in description string — fragile for normalize
- **Fix:** Added `catalog_id?: number` to RawListing; enrich sets it from detail parse
- **Files modified:** scraper/src/subito/extract.ts, scraper/src/vinted/enrich.ts
- **Committed in:** a872bab

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Required for correct persist-time category assignment in scraper runtime. No FilterSheet or filter UI scope creep.

## Issues Encountered

- Plan verify command `-x` flag unsupported by vitest v3 — ran `vitest run lib/listings/canonical-categories.test.ts` instead (17/17 pass)
- Pre-existing `lib/admin/url-validate.test.ts` failure unrelated to this plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 17-05 can build admin seed URLs from same catalog ID table
- Vinted listings will match Subito category filters once crawled and persisted
- Operator may tune TBD/best-effort catalog IDs in vinted-category-map.ts as live supply patterns emerge

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: `.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-04-SUMMARY.md`
- FOUND: commit `16a9f39`
- FOUND: commit `a872bab`
- FOUND: `lib/listings/vinted-category-map.ts`
- FOUND: vinted branch in `lib/listings/canonical-categories.ts`
