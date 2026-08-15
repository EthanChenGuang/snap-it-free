---
phase: 18-facebook-marketplace-scraping
plan: 04
subsystem: listings
tags: [facebook, categories, canonical-slug, filter, CAT-01, CAT-03]
status: complete

requires:
  - phase: 18-facebook-marketplace-scraping
    plan: 03
    provides: enrich layer with facebook_category_id from GraphQL cards/detail
provides:
  - FACEBOOK_CATEGORY_TO_SUBITO_SLUG map with Wave 0 fixture IDs
  - resolveCanonicalCategorySlug facebook branch (DB slug → map → inference → null)
  - Category slug persisted at normalize time; re-applied on crawl hash change
  - Filter parity for facebook listings via persisted/inferred canonical slug
affects:
  - 18-05 (mixed feed display)
  - 18-07 (human UAT category filter checks)

tech-stack:
  added: []
  patterns:
    - "facebook_category_id on RawListing separate from persisted canonical category slug"
    - "Raw FB category ID stored in raw_payload metadata only — not consumer UI (D-18-58)"
    - "FilterSheet unchanged — facebook matches via same resolveCanonicalCategorySlug path as Vinted"

key-files:
  created:
    - lib/listings/facebook-category-map.ts
    - lib/listings/facebook-category-map.test.ts
  modified:
    - lib/listings/canonical-categories.ts
    - lib/listings/canonical-categories.test.ts
    - lib/listings/subito-categories.test.ts
    - scraper/src/facebook/normalize.ts
    - scraper/src/facebook/normalize.test.ts
    - scraper/src/shared/persist.ts
    - scraper/src/shared/persist.test.ts
    - scraper/src/subito/extract.ts
    - scraper/src/facebook/enrich.ts

key-decisions:
  - "D-18-50 option-a: central resolver facebook branch + FACEBOOK_CATEGORY_TO_SLUG (auto-selected)"
  - "D-18-62 option-a: FilterSheet unchanged — filter via persisted canonical slug only (auto-selected)"

patterns-established:
  - "mapFacebookCategoryToSlug mirrors mapVintedCatalogToSlug for scraper-safe lib import"
  - "persistListing touch path updates category when crawl_content_hash changes (D-18-56)"

requirements-completed: [CAT-01, CAT-03, D-18-49, D-18-50, D-18-51, D-18-52, D-18-53, D-18-54, D-18-55, D-18-56, D-18-57, D-18-58, D-18-59, D-18-60, D-18-61, D-18-62, D-18-63]

metrics:
  duration: 3min
  completed: 2026-08-15
  tasks: 3
  files: 11
---

# Phase 18 Plan 04: Facebook Category Mapping Summary

**One-liner:** Hybrid Facebook→Subito canonical slug resolver with Wave 0 fixture map, title inference fallback, scrape-time persist, and filter parity — FilterSheet UI unchanged.

## Accomplishments

- Auto-selected **D-18-50 option-a**: extended `CanonicalCategoryInput` with `facebookCategoryId`; replaced D-09 always-null stub with central resolver branch.
- Auto-selected **D-18-62 option-a**: no FilterSheet changes; facebook listings match category filters via persisted/inferred canonical slug like Vinted.
- Created `FACEBOOK_CATEGORY_TO_SUBITO_SLUG` seeded from Wave 0 fixture IDs (`847807938447238` → `arredamento-casalinghi`, `847807938447239` → `libri-riviste`).
- `normalizeFacebookRawListing` resolves and persists canonical slug; raw FB ID stashed in `raw_payload.facebook_category_id` only.
- `persistListing` refreshes `category` on touch when `crawl_content_hash` changes (D-18-56).

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 3 | 8cb7e4c | FACEBOOK_CATEGORY_TO_SLUG, resolver branch, tests, normalize/persist integration |

## Decisions Made

- **D-18-50 option-a** — Central resolver facebook branch (auto-selected at checkpoint)
- **D-18-62 option-a** — FilterSheet unchanged; canonical slug filter path (auto-selected at checkpoint)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added `facebook_category_id` to RawListing**
- **Found during:** Task 3
- **Issue:** Enrich layer wrote raw FB ID into a `category` field that normalize discarded; resolver had no input for map lookup.
- **Fix:** Added `facebook_category_id` on `RawListing`; updated `enrichFacebookCard` to populate it; normalize reads it for resolver input.
- **Files modified:** `scraper/src/subito/extract.ts`, `scraper/src/facebook/enrich.ts`
- **Commit:** 8cb7e4c

## Verification

- `npm run test:lib` — canonical-categories, subito-categories, facebook-category-map: all pass (428/428 lib suite)
- `scraper` vitest — normalize.test.ts, persist.test.ts: 11/11 pass
- Grep confirms D-09 stub removed; `source === 'facebook'` branch present
- FilterSheet (`components/listings/FilterSheet.tsx`) not modified

## Self-Check: PASSED

- FOUND: lib/listings/facebook-category-map.ts
- FOUND: lib/listings/facebook-category-map.test.ts
- FOUND: 8cb7e4c
