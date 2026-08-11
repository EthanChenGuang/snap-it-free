---
phase: 15-scraper-incremental-crawl-and-search-efficiency
plan: 03
subsystem: scraper
tags: [vitest, subito, crawl-hash, early-stop, http-extract, incremental-crawl]

requires:
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 01
    provides: Wave 0 spike field map + fixture
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 02
    provides: listings.crawl_content_hash column
provides:
  - parseCategoryNextData fixture-driven category JSON extract (SCRP-E01)
  - crawlContentHash two-tier hash distinct from persist contentHash (D-15-25)
  - applyEarlyStop K=5 adjacency + full-refresh disable (SCRP-E02/E03)
  - loadKnownListingSet once-per-run Map loader (D-15-07)
  - persistListing crawl_content_hash write path
affects: [15-04, 15-05]

tech-stack:
  added: []
  patterns:
    - "JSON.parse allowlisted field map from __NEXT_DATA__ — no Playwright on primary path"
    - "Early-stop walks listing array order; break at K consecutive known-unchanged"
    - "Full refresh routes hash-unchanged to touchCandidates without workQueue detail visit"

key-files:
  created:
    - scraper/src/subito/http-extract.ts
    - scraper/src/subito/http-extract.test.ts
    - scraper/src/subito/crawl-hash.ts
    - scraper/src/subito/crawl-hash.test.ts
    - scraper/src/subito/early-stop.ts
    - scraper/src/subito/early-stop.test.ts
    - scraper/src/subito/known-set.ts
    - scraper/src/subito/known-set.test.ts
  modified:
    - scraper/src/shared/persist.ts
    - scraper/src/shared/persist.test.ts
    - scraper/src/shared/schema.ts

key-decisions:
  - "Early-stop break leaves tail listings unprocessed — correct per D-15-05 newest-first assumption"
  - "Municipality centroid from geo.city/town JSON for lat/lng without detail page (D-15-11)"

patterns-established:
  - "crawlContentHash payload: title|price|images|posted_at"
  - "known unchanged = external_id in Map AND crawl hash equality"

requirements-completed: [SCRP-E01, SCRP-E02, SCRP-E03]

coverage:
  - id: D1
    description: "parseCategoryNextData extracts RawListing[] from fixture __NEXT_DATA__ without Playwright"
    requirement: SCRP-E01
    verification:
      - kind: unit
        ref: "scraper/src/subito/http-extract.test.ts#parseCategoryNextData"
        status: pass
    human_judgment: false
  - id: D2
    description: "crawlContentHash distinct from persist contentHash; price change changes hash"
    requirement: SCRP-E02
    verification:
      - kind: unit
        ref: "scraper/src/subito/crawl-hash.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "applyEarlyStop K=5 boundary, empty known Map, isFullRefresh no break, mid-list reset"
    requirement: SCRP-E02
    verification:
      - kind: unit
        ref: "scraper/src/subito/early-stop.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "loadKnownListingSet single query; persist writes crawl_content_hash"
    requirement: SCRP-E03
    verification:
      - kind: unit
        ref: "scraper/src/subito/known-set.test.ts#loadKnownListingSet"
        status: pass
      - kind: unit
        ref: "scraper/src/shared/persist.test.ts#writes crawl_content_hash on insert when provided"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-11
status: complete
---

# Phase 15 Plan 03: Crawl Layer Library Summary

**Fixture-driven __NEXT_DATA__ extract, two-tier crawl hash, K=5 early-stop, and known-set loader with persist crawl_content_hash writes — all green in vitest**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-11T18:03:00Z
- **Completed:** 2026-08-11T18:11:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- `parseCategoryNextData` maps spike field paths to `RawListing` with municipality centroid coords and jsonFieldCompleteness metric
- `crawlContentHash` uses `title|price|images|posted_at` — verified distinct from persist `contentHash(title|photo_url|lat|lng)`
- `applyEarlyStop` implements consecutive-known counter with K=5 break, empty-map passthrough, full-refresh touchCandidates routing
- `loadKnownListingSet` loads `external_id + crawl_content_hash` in one Supabase query
- `persistListing` upsert includes `crawl_content_hash` when present; touch-on-same-content_hash unchanged

## Task Commits

1. **Task 1: End-to-end fixture path — JSON extract → crawl hash → early-stop** - `f219583` (feat)
2. **Task 2: known-set loader + persist crawl_content_hash** - `e8b35c7` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `scraper/src/subito/http-extract.ts` - __NEXT_DATA__ category parse without Playwright
- `scraper/src/subito/crawl-hash.ts` - crawl-layer SHA-256 hash
- `scraper/src/subito/early-stop.ts` - incremental skip / full-refresh touch routing
- `scraper/src/subito/known-set.ts` - once-per-run known Map loader
- `scraper/src/shared/persist.ts` - crawl_content_hash on upsert
- `scraper/src/shared/schema.ts` - optional crawl_content_hash on CanonicalListing

## Decisions Made

- Early-stop break exits the listing walk immediately at K — tail listings are intentionally unprocessed (newest-first assumption)
- Geo from JSON `geo.city`/`geo.town` via existing municipality centroid lookup (D-15-11)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-04 can wire `HttpCrawler` requestHandler to `parseCategoryNextData` + `applyEarlyStop`
- Plan 15-05 can call `loadKnownListingSet` once before `crawler.run`
- Full scraper suite: 113 tests passing

## Self-Check: PASSED

- FOUND: scraper/src/subito/http-extract.ts
- FOUND: scraper/src/subito/crawl-hash.ts
- FOUND: scraper/src/subito/early-stop.ts
- FOUND: scraper/src/subito/known-set.ts
- FOUND: commit f219583
- FOUND: commit e8b35c7

---
*Phase: 15-scraper-incremental-crawl-and-search-efficiency*
*Completed: 2026-08-11*
