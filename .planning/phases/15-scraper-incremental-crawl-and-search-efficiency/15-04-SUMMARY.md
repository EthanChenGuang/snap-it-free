---
phase: 15-scraper-incremental-crawl-and-search-efficiency
plan: 04
subsystem: scraper
tags: [crawlee, HttpCrawler, Playwright, fallback-queue, feature-flag, SCRP-E01, SCRP-E04]
status: complete

requires:
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 03
    provides: parseCategoryNextData, applyEarlyStop, crawl-hash
provides:
  - runSubitoCrawler HttpCrawler primary behind USE_HTTP_CRAWLER (SCRP-E01)
  - Playwright fallback queue concurrency 1 with 10% detail cap (SCRP-E04)
  - fallback-queue pure helpers + unit tests
  - shadow_compare structured log hook
affects: [15-05]

tech-stack:
  added: []
  patterns:
    - "USE_HTTP_CRAWLER off → legacy Playwright N+1; on|shadow|unset → HttpCrawler primary"
    - "Block retry: one Playwright category fetch per blocked URL then mark failed"
    - "Detail enrichment only when coords null or price/title ambiguous; cap ceil(10% listingsSeen)"
    - "Cookie wall: Playwright accept → Session.setCookies best-effort for HTTP continuation"

key-files:
  created:
    - scraper/src/subito/fallback-queue.ts
    - scraper/src/subito/fallback-queue.test.ts
  modified:
    - scraper/src/subito/crawler.ts
    - scraper/src/subito/extract.ts
    - scraper/src/config.ts

key-decisions:
  - "unset USE_HTTP_CRAWLER defaults to on (post-cutover per D-15-28)"
  - "Shadow mode logs single HTTP run metrics — no dual legacy load"
  - "Block retry and detail enrichment use separate PlaywrightCrawler runs both at concurrency 1"
  - "Cookie export via Crawlee Session.setCookies(cookies, origin) — best-effort; falls back silently on API mismatch"

requirements-completed: [SCRP-E01, SCRP-E04]

metrics:
  duration: ~8min
  completed: 2026-08-11
  tasks: 2
  tests_added: 9
---

# Phase 15 Plan 04: HttpCrawler Primary + Playwright Fallback Summary

**HttpCrawler category fetch behind USE_HTTP_CRAWLER with concurrency-1 Playwright fallback for block retry and capped detail enrichment**

## One-liner

Wired Crawlee HttpCrawler as the primary Subito category path with USE_HTTP_CRAWLER flag routing, extended CrawlResult metrics, and a fallback-queue module enforcing 10% detail cap and single Playwright retry per blocked URL.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | HttpCrawler primary path in runSubitoCrawler | 3dd8116 | crawler.ts, config.ts |
| 2 | Playwright fallback queue — block retry, detail cap, cookies | 43e90b8 | fallback-queue.ts, fallback-queue.test.ts, extract.ts |

## Implementation Notes

### Feature flag (`config.ts`)

- `getUseHttpCrawlerMode()`: `off` | `shadow` | `on`; unset → `on`
- `isHttpCrawlerEnabled()` gates HTTP vs legacy Playwright-only

### HttpCrawler primary (`crawler.ts`)

- Extended `runSubitoCrawler(categoryUrls, preset, proxyUrlOverride?, options?)` with `knownMap`, `earlyStopK`, `isFullRefresh`, `mode`
- `HttpCrawler` uses preset retries/concurrency, proxy session pool when proxy set
- Per category URL: body → `parseCategoryNextData` → `applyEarlyStop` → route listings
- 403 / missing JSON / empty listings → block retry queue (one Playwright attempt)
- `CrawlResult` extended: `httpRequests`, `listingsSkippedAtCrawl`, `jsonFieldCompleteness`, `blockedUrlCount`, `detailCapDeferred`, `crawlMode`
- Shadow mode emits `event=shadow_compare` JSON line

### Fallback queue (`fallback-queue.ts`)

- `shouldVisitDetail`: coords null OR price ambiguous/missing OR paid title keywords OR `isMislabeledFree`
- `detailBudgetCap`: `Math.ceil(0.10 * listingsSeen)`
- `selectDetailCandidates`: budget-limited detail pool; overflow logged as `detail_cap_deferred`
- `FALLBACK_CONCURRENCY = 1` for both block-retry and detail Playwright crawlers

### Cookie export (D-15-14)

After Playwright cookie accept on block retry, cookies exported via `session.setCookies(cookies, 'https://www.subito.it')`. Wrapped in try/catch — if Crawlee session API differs at runtime, HTTP path continues without cookie injection.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|------------|
| T-15-07 proxy in logs | `maskProxyHost()` logs hostname only |
| T-15-08 detail explosion | 10% cap + concurrency 1 |
| T-15-06 empty JSON soft-block | CategoryParseError → block retry → failed URL mark |

## Verification

```bash
cd scraper && npm test                                    # 122/122 pass
cd scraper && npx vitest run src/subito/http-extract.test.ts src/subito/early-stop.test.ts
grep -q 'HttpCrawler' scraper/src/subito/crawler.ts
cd scraper && npx vitest run src/subito/fallback-queue.test.ts  # 9/9 pass
```

## Self-Check: PASSED

- FOUND: scraper/src/subito/fallback-queue.ts
- FOUND: scraper/src/subito/fallback-queue.test.ts
- FOUND: scraper/src/subito/crawler.ts
- FOUND: scraper/src/config.ts
- FOUND: commit 3dd8116
- FOUND: commit 43e90b8
