---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
plan: 03
subsystem: scraper
tags: [vinted, crawler, enrichment, incremental, proxy-fallback, early-stop, shipping-gate]
requires:
  - phase: 17
    plan: 02
    provides: listing_source vinted enum, minimal runVintedCrawler tracer, worker vinted branch
provides:
  - Full runVintedCrawler HttpCrawler hybrid with early-stop, block retry, detail budget
  - enrich.ts detail enrichment (catalog_id, shipping.type, seller city, centroid fallback)
  - isLocalPickup shipping-only rejection and matchesCityIntent city validation
  - runVintedCrawlWithProxyFallback and adapted validateBatchHttp thresholds for sparse €0
  - SCRP-E07 crawl vs persist metrics wired on vinted worker path
affects:
  - 17-04 (category mapping from catalog_id)
  - 17-05 (admin flip vinted live with seed URLs)

tech-stack:
  added: []
  patterns:
    - Vinted HttpCrawler session-warm + catalog API fetch per category URL
    - Shared subito early-stop/crawl-hash with vinted known-set re-export
    - enrichListingDetail HTTP path for shipping gate + seller geo before persist
    - Vinted incremental validation minCountRatio 0 (sparse €0 yield per 17-RESEARCH)

key-files:
  created:
    - scraper/src/vinted/enrich.ts
    - scraper/src/vinted/enrich.test.ts
    - scraper/src/vinted/known-set.ts
    - scraper/src/vinted/detail-queue.ts
  modified:
    - scraper/src/vinted/crawler.ts
    - scraper/src/vinted/filters.ts
    - scraper/src/vinted/filters.test.ts
    - scraper/src/vinted/http-extract.ts
    - scraper/src/worker.ts
    - scraper/src/worker-proxy-fallback.ts
    - scraper/src/shared/validate-run.ts
    - scraper/src/shared/validate-run.test.ts

key-decisions:
  - "D-17-32 option-a: new vinted/ module mirroring Subito HttpCrawler + incremental orchestration"
  - "D-17-15 option-a: reject shipping.type === 'shipping' without pickup signal at enrich layer"
  - "Vinted incremental validateBatchHttp minCountRatio 0 — documented €0 scarcity escape (SCRP-E08)"

patterns-established:
  - "Vinted detail enrichment: escaped-RSC regex for catalog_id/shipping.type; posted_at falls back to scrape run time (A3)"
  - "City intent encoded via ?city=venezia|padova on admin catalog URLs; matchesCityIntent validates seller city post-extract (D-17-10)"
  - "runVintedCrawlWithProxyFallback wraps runVintedCrawler with ProxyQuotaFatalError direct retry (D-17-33)"

requirements-completed: [SCRP-E02, SCRP-E03, SCRP-E04, SCRP-E05, SCRP-E06, SCRP-E07, SCRP-E08, D-17-03, D-17-08, D-17-10, D-17-12, D-17-13, D-17-15, D-17-32, D-17-33]

coverage:
  - id: D1
    description: "runVintedCrawler accepts knownMap and earlyStopK; HttpCrawler hybrid with block retry"
    requirement: SCRP-E04
    verification:
      - kind: unit
        ref: "grep earlyStopK runVintedCrawler scraper/src/vinted/crawler.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Incremental known-set + early-stop K=5 per URL scope"
    requirement: SCRP-E02
    verification:
      - kind: unit
        ref: "scraper/src/vinted/crawler.ts applyEarlyStop integration"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full refresh disables early-stop break"
    requirement: SCRP-E03
    verification:
      - kind: unit
        ref: "scraper/src/subito/early-stop.ts + vinted crawler isFullRefresh path"
        status: pass
    human_judgment: false
  - id: D4
    description: "Enrichment rejects shipping-only; resolves catalog_id, seller city, centroid fallback"
    requirement: D-17-15
    verification:
      - kind: unit
        ref: "scraper/src/vinted/enrich.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "matchesCityIntent validates URL city= metadata vs seller city"
    requirement: D-17-10
    verification:
      - kind: unit
        ref: "scraper/src/vinted/filters.test.ts#matchesCityIntent"
        status: pass
    human_judgment: false
  - id: D6
    description: "Proxy quota fatal triggers direct fallback for vinted"
    requirement: D-17-33
    verification:
      - kind: unit
        ref: "scraper/src/worker-proxy-fallback.ts runVintedCrawlWithProxyFallback"
        status: pass
    human_judgment: false
  - id: D7
    description: "validateBatchHttp vinted profile with sparse €0 incremental floor"
    requirement: SCRP-E08
    verification:
      - kind: unit
        ref: "scraper/src/shared/validate-run.test.ts#passes vinted incremental"
        status: pass
    human_judgment: false
  - id: D8
    description: "Worker passes listingsSkippedAtCrawl and wall_time_seconds to finishScrapeRun"
    requirement: SCRP-E07
    verification:
      - kind: unit
        ref: "grep listingsSkippedAtCrawl wall_time_seconds scraper/src/worker.ts"
        status: pass
    human_judgment: true
    rationale: "Live crawl→DB E2E requires outbound vinted.it + migration; metrics wiring verified in code"

duration: 2min
completed: 2026-08-15
status: complete
---

# Phase 17 Plan 03: Full Vinted Crawler Summary

**HttpCrawler hybrid Vinted crawler with shipping-only rejection, seller geo enrichment, incremental early-stop, proxy fallback, and sparse-€0 validation thresholds**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-15T14:08:04Z
- **Completed:** 2026-08-15T14:10:00Z
- **Tasks:** 3 (2 decision checkpoints + 1 TDD implementation)
- **Files modified:** 12

## Accomplishments

- Expanded `runVintedCrawler` to Subito parity: RequestQueue per run, session-warm catalog GET + API fetch, early-stop via shared `applyEarlyStop`, Playwright block retry at concurrency 1, detail budget cap (D-17-32, SCRP-E04/E06)
- Implemented `enrich.ts`: `parseItemDetail` (escaped-RSC regex), `fetchSellerLocation`, `isLocalPickup` rejects shipping-only, `matchesCityIntent` for `?city=` URL metadata, centroid fallback when city without coords (D-17-12/13/15)
- Added `runVintedCrawlWithProxyFallback`, worker `earlyStopK` wiring, and vinted-specific `validateBatchHttp` thresholds (`minCountRatioIncremental: 0`) for sparse €0 yield (D-17-33, SCRP-E05/E08)
- SCRP-E07 metrics: worker logs `crawl_complete` with `crawl_skipped` + `wall_time_seconds`; `finishScrapeRun` persists `listings_skipped_at_crawl`, `listings_skipped`, `listings_rejected`, `wall_time_seconds`

## Task Commits

1. **Task 1: Confirm Vinted crawler architecture (D-17-32)** — decision option-a recorded; no code commit
2. **Task 2: Confirm shipping-only rejection policy (D-17-15)** — decision option-a recorded; no code commit
3. **Task 3: Full crawler, enrichment, incremental, proxy fallback, validation** — `9ec129c` (test) + `4ce5ac0` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `scraper/src/vinted/enrich.ts` — detail enrichment, shipping gate, city intent, seller geo
- `scraper/src/vinted/crawler.ts` — full HttpCrawler hybrid with early-stop and block retry
- `scraper/src/vinted/detail-queue.ts` — Vinted detail budget selection
- `scraper/src/vinted/known-set.ts` — re-export `loadKnownListingSet` for source=vinted
- `scraper/src/worker-proxy-fallback.ts` — `runVintedCrawlWithProxyFallback`
- `scraper/src/worker.ts` — earlyStopK + vinted validation profile + metrics
- `scraper/src/shared/validate-run.ts` — `VINTED_MIN_COUNT_RATIO_*` constants

## Decisions Made

- **D-17-32 option-a:** New `vinted/` module mirroring Subito HttpCrawler stack — shared early-stop/proxy/known-set
- **D-17-15 option-a:** Reject `shipping.type === 'shipping'` without pickup signal — preserves local collectible contract
- **SCRP-E08:** Vinted incremental `minCountRatio` 0 — €0 listings sparse on vinted.it per Wave 0 spike

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Full `npm test` has 1 pre-existing failure in `src/translate/ingest.test.ts` (`@/lib/geo/italian-cities` path alias in vitest) — unrelated to this plan; plan-scoped vinted vitest 40/40 pass, 174/174 non-failing tests pass

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 17-04 can map `catalog_id` from enrichment to canonical categories
- Plan 17-05 can seed admin URLs with `?city=venezia|padova` intent and flip vinted live
- Live E2E crawl→persist pending migration 028 apply + €0 supply on target catalogs

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: `.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-03-SUMMARY.md`
- FOUND: commit `9ec129c`
- FOUND: commit `4ce5ac0`
