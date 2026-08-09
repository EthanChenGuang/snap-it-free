---
phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
plan: 03
subsystem: scraper
tags: [subito, ingest, padova, city-region, zod, translate, d-18, d-24, d-31]

requires:
  - 08-02
    provides: Migration 020 city/region columns and D-28 listings_public view
provides:
  - normalizeRawListing sets city/region from source_category_url
  - persist.ts writes city/region/category on upsert
  - City-keyed Zod bbox validation (Padova vs Venice)
  - Category i18n via catalog label lookup at translate ingest
  - config-loader test proving DB target_urls override fallback
affects:
  - 08-05 Elenco category chips and city labels

tech-stack:
  added: []
  patterns:
    - "parseRegaloCategoryUrl at normalize for city/region; extractCategoryFromSubitoUrl on detail URL for slug"
    - "CanonicalListingSchema superRefine selects bbox by city field"
    - "translateAfterPersist maps category slug to SUBITO_REGALO_CATALOG labelIt"

key-files:
  created: []
  modified:
    - scraper/src/shared/normalize.ts
    - scraper/src/shared/persist.ts
    - scraper/src/shared/schema.ts
    - scraper/src/translate/ingest.ts
    - scraper/src/config-loader.test.ts
    - scraper/src/shared/normalize.test.ts
    - scraper/src/shared/persist.test.ts
    - scraper/src/shared/schema.test.ts

key-decisions:
  - "Schema city-keyed superRefine uses PADOVA bbox from extract.ts constants (D-24)"
  - "Category translate passes Italian catalog label, not slug, to translation provider (D-31)"
  - "Live Padova persist deferred — SUPABASE env missing; unit tests satisfy D-18 contract"

requirements-completed: [SCRP-01 (extended), D-18 target_urls]

coverage:
  - id: D1
    description: "normalizeRawListing sets city/region from source_category_url and category slug from detail URL"
    requirement: "SCRP-01 (extended)"
    verification:
      - kind: unit
        ref: "scraper/src/shared/normalize.test.ts#sets city and region from source_category_url"
        status: pass
    human_judgment: false
  - id: D2
    description: "persist row includes city, region, category on upsert"
    requirement: "SCRP-01 (extended)"
    verification:
      - kind: unit
        ref: "scraper/src/shared/persist.test.ts#upserts new listing with geom WKT when coords present"
        status: pass
    human_judgment: false
  - id: D3
    description: "City-keyed Zod accepts Padova coords when city=padova, rejects for venezia"
    requirement: "SCRP-01 (extended)"
    verification:
      - kind: unit
        ref: "scraper/src/shared/schema.test.ts#accepts Padova lat/lng when city is padova"
        status: pass
    human_judgment: false
  - id: D4
    description: "Worker loadSourceConfig merges DB target_urls over 3-URL fallback"
    requirement: "D-18 target_urls"
    verification:
      - kind: unit
        ref: "scraper/src/config-loader.test.ts#merges Padova informatica URL from DB over 3-URL fallback"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live Padova listing row in Supabase with city=padova, zone IS NULL"
    requirement: "SCRP-01 (extended)"
    verification: []
    human_judgment: true
    rationale: "Requires operator to set SUPABASE_URL + SERVICE_ROLE_KEY and apply migration 020 before live worker persist test"

duration: 3min
completed: 2026-08-05
status: complete
---

# Phase 08 Plan 03: Scraper Ingest Pipeline Summary

**City/region/category metadata at persist, Padova-aware Zod validation, and catalog-backed category translation wired into scraper ingest**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-05T17:50:00Z
- **Completed:** 2026-08-05T17:52:39Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- **normalizeRawListing** parses `source_category_url` via `parseRegaloCategoryUrl` for `city`/`region`; category slug from detail `external_url` (D-17, D-25, D-26)
- **persist.ts** upsert row includes `city`, `region`, `category` columns for migration 020 schema
- **CanonicalListingSchema** uses city-keyed `superRefine` — Padova bbox (45.3–45.5 / 11.7–12.0) when `city='padova'`, Venice bounds otherwise (D-24)
- **translateAfterPersist** maps category slug to `SUBITO_REGALO_CATALOG.labelIt` before translation (D-31)
- **config-loader.test.ts** proves DB Padova URL array overrides `SUBITO_CATEGORY_URLS` 3-URL fallback (D-13, D-18)
- Standard preset `minConcurrency` remains 1 — no change for 34-URL volume (D-20)

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 RED | d4d6997 | Failing tests for city/region persist |
| 1 GREEN | f890869 | normalize + persist city/region/category |
| 2 GREEN | 722a246 | City-keyed Zod geo + category translate |
| 3 | ca543fc | config-loader Padova URL override test |

## Files Created/Modified

- `scraper/src/shared/normalize.ts` — city/region from source_category_url
- `scraper/src/shared/persist.ts` — city/region on upsert row
- `scraper/src/shared/schema.ts` — optional city/region + superRefine bbox
- `scraper/src/translate/ingest.ts` — catalog label lookup for category translate
- `scraper/src/config-loader.test.ts` — Padova URL merge test
- Test files for normalize, persist, schema

## Decisions Made

- Schema city-keyed validation co-implemented with normalize since Padova coords fail Venice-only bounds
- Live Supabase persist verification deferred — env vars not configured; unit tests satisfy contract

## Deviations from Plan

None — plan executed exactly as written.

## User Setup Required

**Before live Padova ingest verification:**

1. Apply migration `020_subito_location_category.sql` to Supabase
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in scraper environment
3. Configure Padova informatica URL in admin `target_urls` (Plan 04 matrix)
4. Run worker against single Padova URL and confirm listing row: `city='padova'`, `category='informatica'`, `zone IS NULL`

## Issues Encountered

None

## Next Phase Readiness

- Scraper ingest pipeline ready for admin-seeded expanded URL matrix (Plan 04 already shipped)
- Plan 05 consumer UI can rely on `city`, `region`, `category` columns in listings_public

## Self-Check: PASSED

- FOUND: scraper/src/shared/normalize.ts
- FOUND: scraper/src/shared/persist.ts
- FOUND: scraper/src/shared/schema.ts
- FOUND: d4d6997
- FOUND: f890869
- FOUND: 722a246
- FOUND: ca543fc
