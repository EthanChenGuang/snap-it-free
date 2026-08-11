---
phase: 15-scraper-incremental-crawl-and-search-efficiency
verified: 2026-08-11T18:28:00Z
status: human_needed
score: 7/8 must-haves verified
behavior_unverified: 2
overrides_applied: 0
gaps:
  - truth: "Incremental crawl loads known external_id set; skips unchanged listings at crawl layer; early-stop after K consecutive known listings"
    status: resolved
    resolved_by: "normalizeRawListing now computes crawl_content_hash via crawlHashForListing(raw) at scraper/src/shared/normalize.ts:61; UAT integration script confirms hash round-trip + early-stop match"
    resolved_at: 2026-08-11
behavior_unverified_items:
  - truth: "Wall time and HTTP request count drop measurably vs baseline (≥10× fewer requests for 34-URL matrix)"
    test: "Run full Subito matrix with USE_HTTP_CRAWLER=on on populated DB; compare scrape_runs.http_requests and wall_time_seconds to pre-Phase-15 baseline runs"
    expected: "http_requests ≤ ~120 (vs ~1,050 baseline) and wall_time_seconds materially lower on happy path"
    why_human: "Metrics columns and structured logs exist but no benchmark artifact or CI test proves production-scale request/time reduction"
  - truth: "Production incremental early-stop reduces crawl work on second+ run with populated DB"
    test: "Run two consecutive incremental Subito scrapes on populated DB; inspect crawl_complete log crawl_skipped > 0 and http_requests << category URL count"
    expected: "Second run early-stops per category; listings_skipped_at_crawl > 0; detail/Playwright queue minimal"
    why_human: "Code path wired and integration script passes; live two-run benchmark requires operator-triggered scrape (UAT test 18 blocked)"
---

# Phase 15: Scraper Incremental Crawl & Search Efficiency Verification Report

**Phase Goal:** Replace the Subito worker's N+1 Playwright detail loop with an HTTP-first category JSON path, DB-aware incremental early-stop, a documented proxy strategy for production anti-bot, and a confirmed Crawlee hybrid stack (HttpCrawler primary + Playwright fallback only).

**Verified:** 2026-08-11T18:17:00Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Category URL extraction uses embedded JSON — ≤1 HTTP request per category page on happy path | ✓ VERIFIED | `HttpCrawler` in `runHttpHybridCrawler` fetches each category URL once; `parseCategoryNextData` parses `__NEXT_DATA__` at `props.pageProps.initialState.items.originalList`; 6 unit tests in `http-extract.test.ts` |
| 2 | Incremental crawl: known set, crawl-layer skip, early-stop K, 24h full refresh | ✗ FAILED | `loadKnownListingSet`, `applyEarlyStop`, `decideCrawlMode` exist and unit-test green, but **production persist never writes `crawl_content_hash`** — `normalizeRawListing` omits it; `toRawListing` strips price/images before persist |
| 3 | Playwright only for fallback (block retry, detail enrichment, pagination) | ✓ VERIFIED | `runHttpHybridCrawler`: HttpCrawler primary; separate Playwright crawlers for block retry + detail only; `FALLBACK_CONCURRENCY = 1`; `detailBudgetCap` 10%; page-1 only per D-15-23 |
| 4 | Proxy ADR documented; admin surfaces configured/not configured | ✓ VERIFIED | `docs/adr/015-production-proxy.md`; `SettingsClient` proxy chip + last block reason + degraded run count; `evaluateProxyGate` soft degraded in production |
| 5 | Stack ADR: Crawlee + Node, HttpCrawler primary, Playwright secondary | ✓ VERIFIED | `docs/adr/015-scraper-http-stack.md`; `USE_HTTP_CRAWLER` defaults to `on`; legacy Playwright path behind `off` |
| 6 | Run metrics distinguish crawl-skipped vs persist-skipped; measurable request/time drop | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | DB columns `listings_skipped_at_crawl` vs `listings_skipped`; logs `crawl_complete.crawl_skipped` + `persist_breakdown.persist_skipped` — **no benchmark proving ≥10× request reduction** |
| 7 | Batch validation still passes with documented threshold updates | ✓ VERIFIED | `validateBatchHttp` with ADR thresholds (0.9 completeness, 0.5/0.2 count ratios, incremental escape); 10 tests pass in `validate-run.test.ts` |
| 8 | Spike artifact proves JSON field map incl. Venezia arredamento-casalinghi | ✓ VERIFIED | `15-SPIKE-HTTP-CATEGORY.md` PASS; Venezia URL + field map; fixture `scraper/fixtures/subito-category-next-data-fragment.json`; spike script exists |

**Score:** 6/8 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `scraper/src/subito/http-extract.ts` | Category JSON parse | ✓ VERIFIED | Substantive; wired from `crawler.ts` |
| `scraper/src/subito/crawl-hash.ts` | Two-tier crawl hash | ✓ VERIFIED | Used by early-stop; not wired to persist |
| `scraper/src/subito/early-stop.ts` | K=5 early-stop | ✓ VERIFIED | Wired from crawler; DB hash gap breaks production |
| `scraper/src/subito/known-set.ts` | Once-per-run known Map | ✓ VERIFIED | Wired from `worker.ts` |
| `scraper/src/subito/crawler.ts` | HttpCrawler + fallback | ✓ VERIFIED | Wired from worker |
| `scraper/src/subito/fallback-queue.ts` | Detail cap + routing | ✓ VERIFIED | 9 unit tests pass |
| `scraper/src/worker.ts` | Crawl mode, metrics, validation | ✓ VERIFIED | Full integration path |
| `scraper/src/worker-proxy-gate.ts` | Soft proxy gate | ✓ VERIFIED | 9 unit tests pass |
| `supabase/migrations/023_phase15_crawl_metrics.sql` | Schema migration | ✓ VERIFIED | Remote columns confirmed via psql (`t`) |
| `docs/adr/015-scraper-http-stack.md` | Stack ADR | ✓ VERIFIED | Accepted, references spike |
| `docs/adr/015-production-proxy.md` | Proxy ADR | ✓ VERIFIED | Accepted |
| `15-SPIKE-HTTP-CATEGORY.md` | Wave 0 spike PASS | ✓ VERIFIED | All 3 URLs pass |
| `components/admin/SettingsClient.tsx` | Crawl config + proxy UI | ✓ VERIFIED | early_stop_k, full_refresh_hours, max_pages, full crawl trigger |
| `components/admin/DashboardClient.tsx` | Degraded banner | ✓ VERIFIED | `showDegradedBanner` predicate wired |
| `components/admin/RunDetailClient.tsx` | Crawl metrics tiles | ✓ VERIFIED | Crawl skipped, HTTP requests, wall time, crawl mode chip |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `crawler.ts` | `http-extract.ts` | `parseCategoryNextData` in `processCategoryHtml` | ✓ WIRED | |
| `crawler.ts` | `early-stop.ts` | `applyEarlyStop` after parse | ✓ WIRED | |
| `worker.ts` | `known-set.ts` | `loadKnownListingSet` before crawler | ✓ WIRED | |
| `worker.ts` | `crawler.ts` | `runSubitoCrawler` with knownMap + mode | ✓ WIRED | |
| `persist.ts` | `listings.crawl_content_hash` | upsert payload | ✗ NOT_WIRED | Column write conditional on field never populated |
| `SettingsClient` | `/api/admin/jobs` | POST `crawl_mode: full` | ✓ WIRED | |
| `SettingsClient` | `/api/admin/config` | PATCH crawl settings | ✓ WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `known-set.ts` | `crawl_content_hash` | `listings` DB select | Always empty string when column null | ⚠️ HOLLOW — column never populated by persist |
| `RunDetailClient` | `listingsSkippedAtCrawl` | `scrape_runs` via queries | Real when runs complete | ✓ FLOWING |
| `SettingsClient` | `proxyConfigured` | `scraper_global_config.proxy_enc` | Real from API | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Scraper unit suite | `npm test -- --run` in `scraper/` | 135/135 pass | ✓ PASS |
| Admin schema tests | `npm test -- --run lib/admin/schemas.test.ts` | 18/18 pass | ✓ PASS |
| Remote migration 023 | psql information_schema query | `t` | ✓ PASS |
| Early-stop K=5 | `early-stop.test.ts` (in suite) | pass | ✓ PASS |
| crawl_content_hash production write | grep normalize/persistBatch | not found | ✗ FAIL |

### Probe Execution

Step 7c: SKIPPED — no phase-declared probe scripts beyond spike (live network; not re-run in verify).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| SCRP-E01 | 15-01, 15-03, 15-04 | HTTP category JSON extract | ✓ SATISFIED | http-extract + HttpCrawler |
| SCRP-E02 | 15-02, 15-03 | Incremental early-stop | ✗ BLOCKED | crawl_content_hash not persisted |
| SCRP-E03 | 15-02, 15-05 | 24h full refresh | ✓ SATISFIED | `decideCrawlMode` + `updateLastFullRefreshAt` |
| SCRP-E04 | 15-04 | Playwright fallback only | ✓ SATISFIED | Hybrid crawler architecture |
| SCRP-E05 | 15-01, 15-05, 15-06 | Proxy ADR + admin | ✓ SATISFIED | ADR + Settings + soft gate |
| SCRP-E06 | 15-01, 15-04 | Stack ADR Crawlee primary | ✓ SATISFIED | ADR + HttpCrawler default on |
| SCRP-E07 | 15-02, 15-05, 15-06 | Crawl vs persist metrics | ⚠️ PARTIAL | Columns/logs wired; perf drop unproven |
| SCRP-E08 | 15-05 | JSON validation gate | ✓ SATISFIED | validateBatchHttp + ADR thresholds |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME in phase-modified scraper/admin files | — | — |

### Human Verification Required

1. **Matrix performance vs baseline** — Run 34-URL matrix with HTTP crawler enabled; confirm `http_requests` and `wall_time_seconds` on `scrape_runs` show ≥10× request reduction vs historical Playwright runs.

2. **Incremental early-stop after hash fix** — After closing the `crawl_content_hash` gap, run two incremental scrapes on populated DB and confirm `listings_skipped_at_crawl > 0` and reduced Playwright detail queue.

### Gaps Summary

Phase 15 delivers the HTTP-first crawl architecture, ADRs, schema, admin UI, validation gate, and unit-tested early-stop logic. The **critical production wiring gap** is that `crawl_content_hash` is never computed or stored when listings are persisted. `loadKnownListingSet` therefore returns empty hashes for all existing rows, and `isKnownUnchanged` cannot match — incremental early-stop does not work on a populated database after the first scrape.

Fix: extend the persist pipeline (normalize or persistBatch) to compute `crawlHashForListing` from HTTP fields (price, images, posted_at, title) and write `crawl_content_hash` on every insert/update; optionally refresh on full-refresh touch path.

Secondary: production performance target (≥10× fewer requests) is architecturally plausible (1 HTTP/category vs N+1 detail) but not yet measured in `scrape_runs` data.

---

_Verified: 2026-08-11T18:17:00Z_  
_Verifier: Claude (gsd-verifier)_
