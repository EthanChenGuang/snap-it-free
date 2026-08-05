---
phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
plan: 01
subsystem: scraper
tags: [subito, playwright, padova, vitest, crawlee, geo-bbox]

requires: []
provides:
  - Padova spike gate script and PASS/FAIL artifact (D-15)
  - Fixed extractCategoryFromSubitoUrl detail-URL parser (D-18)
  - parseRegaloCategoryUrl url-context module
  - SUBITO_REGALO_CATALOG skeleton with URL builders
  - inCityBbox Padova/Venice geo gate (D-21)
  - Crawler source_category_url propagation (D-20)
affects:
  - 08-02 schema migration
  - 08-04 admin matrix + recommended seed (Padova gated on spike PASS)

tech-stack:
  added: []
  patterns:
    - "City-aware bbox via parseRegaloCategoryUrl(source_category_url)"
    - "DB category slug preferred over title inference (D-29 scaffold)"

key-files:
  created:
    - scraper/scripts/spike-subito-padova.mjs
    - .planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-PADOVA-SPIKE.md
    - scraper/src/subito/url-context.ts
    - scraper/src/subito/normalize.test.ts
    - lib/admin/subito-regalo-catalog.ts
    - lib/admin/subito-regalo-catalog.test.ts
    - lib/listings/subito-categories.ts
    - lib/listings/subito-categories.test.ts
  modified:
    - scraper/src/subito/normalize.ts
    - scraper/src/subito/extract.ts
    - scraper/src/subito/extract.test.ts
    - scraper/src/subito/crawler.ts

key-decisions:
  - "Padova spike FAIL on detail coords — block Padova half of recommended seed until re-run passes (D-15)"
  - "Padova bbox uses RESEARCH fallback 45.3–45.5 / 11.7–12.0 (no sample coords in spike)"

patterns-established:
  - "parseRegaloCategoryUrl regex for /annunci-{region}/regalo/{slug}/{city}/{city}/"
  - "resolveCoords 4th arg sourceCategoryUrl drives inCityBbox city key"

requirements-completed: [SCRP-01 (extended)]

coverage:
  - id: D1
    description: "Padova spike gate Playwright script + artifact"
    requirement: SCRP-01
    verification:
      - kind: integration
        ref: "node scraper/scripts/spike-subito-padova.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Detail-URL category parser returns informatica slug (D-18)"
    requirement: SCRP-01
    verification:
      - kind: unit
        ref: "scraper/src/subito/normalize.test.ts#extractCategoryFromSubitoUrl"
        status: pass
    human_judgment: false
  - id: D3
    description: "34-URL catalog builder + dedupe (D-06 scaffold)"
    verification:
      - kind: unit
        ref: "lib/admin/subito-regalo-catalog.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Padova coords pass inCityBbox when source URL is Padova"
    verification:
      - kind: unit
        ref: "scraper/src/subito/extract.test.ts#inCityBbox"
        status: pass
    human_judgment: false
  - id: D5
    description: "Spike coord gate — live Subito detail pages yield embed coords"
    verification:
      - kind: integration
        ref: "08-PADOVA-SPIKE.md verdict FAIL (0/2 detail coords)"
        status: fail
    human_judgment: true
    rationale: "Live spike documented FAIL on coord extraction; blocks Padova seed until resolved"

duration: 8min
completed: 2026-08-05
status: complete
---

# Phase 8 Plan 01: Padova Spike + Scraper Tracer Summary

**Padova spike gate executed (FAIL on coords); category parser fixed; city-aware bbox and crawler context wired with unit proof**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-05T17:44:00Z
- **Completed:** 2026-08-05T17:52:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- **Padova spike (D-15):** Playwright script probes 3 slugs — all category pages pass (3/3 HTTP 200, listing cards); detail coord gate **FAIL** (0/2 pages with embed coords in Padova bbox)
- **Parser fix (D-18):** `extractCategoryFromSubitoUrl` reads first path segment on detail URLs; `parseRegaloCategoryUrl` extracts region/city/slug
- **Wave 0 scaffolds:** Catalog module (17 slugs), URL builder (34 URLs), `matchesSubitoCategory` D-29 preference test
- **Geo + crawl path (D-21/D-20):** `inCityBbox` accepts Padova (~45.41, ~11.88); crawler attaches `source_category_url`

## Spike Verdict

| Gate | Required | Result |
|------|----------|--------|
| Category pages | ≥2/3 slugs | **3/3 PASS** |
| Detail coords in Padova bbox | ≥1 | **0 FAIL** |

**Overall: FAIL** — Padova URLs must not ship in recommended seed until coord gate passes (Venice-only seed still allowed).

## Task Commits

1. **Task 1: Padova spike gate** - `e43f3a5` (feat)
2. **Task 2: Wave 0 test scaffolds** - `1ac01b1` (feat)
3. **Task 3: City-aware bbox + crawler** - `7157278` (feat)

## Files Created/Modified

- `scraper/scripts/spike-subito-padova.mjs` — D-15 Playwright gate
- `08-PADOVA-SPIKE.md` — FAIL artifact + fallback bbox constants
- `scraper/src/subito/url-context.ts` — region/city/category parse
- `scraper/src/subito/normalize.ts` — D-18 first-segment parser
- `scraper/src/subito/extract.ts` — `inCityBbox`, `source_category_url` on RawListing
- `scraper/src/subito/crawler.ts` — attaches request.url to listings
- `lib/admin/subito-regalo-catalog.ts` — 17-entry catalog + URL helpers
- `lib/listings/subito-categories.ts` — D-29 filter helper scaffold

## Decisions Made

- Padova recommended seed blocked per D-15 until spike coord gate passes
- Padova bbox uses fallback constants (45.3–45.5 lat, 11.7–12.0 lng) — spike found no sample coords to refine

## Deviations from Plan

None - plan executed exactly as written. Spike FAIL is an expected gate outcome documented in artifact.

## Issues Encountered

- Live Subito Padova detail pages returned no embedded coordinates in spike sample (both `source=none`). Category listing ingestion path is proven; map-pin coord yield for Padova remains unverified (Assumption A1).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Parser, url-context, bbox, and crawler wiring ready for Plan 02 schema migration and Plan 03 persist
- Plan 04 must gate Padova URLs in recommended seed on spike PASS
- Re-run spike after Subito DOM/coord availability changes or with proxy if anti-bot limits detail embeds

## Self-Check: PASSED

- FOUND: scraper/scripts/spike-subito-padova.mjs
- FOUND: .planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-PADOVA-SPIKE.md
- FOUND: scraper/src/subito/url-context.ts
- FOUND: scraper/src/subito/normalize.test.ts
- FOUND: scraper/src/subito/extract.test.ts
- FOUND: lib/admin/subito-regalo-catalog.ts
- FOUND: commit e43f3a5
- FOUND: commit 1ac01b1
- FOUND: commit 7157278

---
*Phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories*
*Completed: 2026-08-05*
