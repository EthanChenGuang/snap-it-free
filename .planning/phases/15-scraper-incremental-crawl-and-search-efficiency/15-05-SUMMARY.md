---
phase: 15-scraper-incremental-crawl-and-search-efficiency
plan: 05
subsystem: scraper
tags: [worker, crawl-mode, proxy-gate, validation, metrics, SCRP-E03, SCRP-E05, SCRP-E07, SCRP-E08]
status: complete

requires:
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 02
    provides: scrape_runs metrics columns, scraper_global_config crawl settings
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 04
    provides: runSubitoCrawler with CrawlResult metrics
provides:
  - decideCrawlMode / evaluateProxyGate in worker-proxy-gate.ts
  - validateBatchHttp JSON completeness gate with incremental escape hatch
  - finishScrapeRun extended metrics (listings_skipped_at_crawl, http_requests, wall_time_seconds, crawl_mode, degraded, json_field_completeness)
  - emailOnly notifyOperator path for blocked-ratio alerts (D-15-31)
affects: [15-06]

tech-stack:
  added: []
  patterns:
    - "Null lastFullRefreshAt or age ≥ fullRefreshHours → full mode; job crawl_mode=full wins"
    - "Production soft proxy gate: degraded=true + warning, no process exit"
    - "HTTP path uses validateBatchHttp; legacy Playwright keeps validateBatch selector gate"
    - "Blocked ratio >50% triggers email-only alert via notifyOperator emailOnly option"

key-files:
  created:
    - scraper/src/worker-proxy-gate.ts
    - scraper/src/worker-proxy-gate.test.ts
  modified:
    - scraper/src/worker.ts
    - scraper/src/config-loader.ts
    - scraper/src/shared/validate-run.ts
    - scraper/src/shared/validate-run.test.ts
    - scraper/src/alert/notify.ts

key-decisions:
  - "validateBatchHttp thresholds: completeness ≥0.9, full count ratio 0.5, incremental 0.2"
  - "Incremental escape: crawlSkipped > 0 + completeness OK allows low raw count pass"
  - "Blocked-ratio alerts use emailOnly — no new Telegram channel in Phase 15"
  - "wall_time_seconds stored with 2 decimal places in finishScrapeRun"

requirements-completed: [SCRP-E03, SCRP-E05, SCRP-E07, SCRP-E08]

metrics:
  duration: ~12min
  completed: 2026-08-11
  tasks: 2
  tests_added: 13
---

# Phase 15 Plan 05: Worker Integration Summary

**Crawl mode, known-set, soft proxy gate, JSON validation, scrape_runs metrics, and email alerts wired into Subito worker**

## One-liner

Integrated incremental/full crawl mode decision, production soft proxy degraded gate, known-set loading, validateBatchHttp completeness gate, extended finishScrapeRun metrics, and email-only blocked-ratio alerts into the worker path.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Crawl mode decision + soft proxy gate + config load | 5b0cc53 | worker-proxy-gate.ts, worker-proxy-gate.test.ts, config-loader.ts, worker.ts |
| 2 | JSON completeness validation + metrics finish + email alerts | 0ed7f57 | validate-run.ts, validate-run.test.ts, notify.ts |

## Implementation Notes

### Crawl mode + proxy gate (`worker-proxy-gate.ts`, `config-loader.ts`)

- `decideCrawlMode`: null `lastFullRefreshAt` → full; age ≥ `fullRefreshHours` → full; `jobCrawlMode=full` overrides timer
- `evaluateProxyGate`: production without proxy → `{ degraded: true, warning }` without throw
- `loadSourceConfig` selects `earlyStopK`, `fullRefreshHours`, `maxPages`, `lastFullRefreshAt`, `proxyConfigured`
- `loadJobCrawlMode`, `updateLastFullRefreshAt`, `recordDegradedRun` helpers added

### Worker orchestration (`worker.ts`)

- `loadKnownListingSet` once before crawl
- Passes `knownMap`, `earlyStopK`, `isFullRefresh`, `mode` to `runSubitoCrawler`
- Measures wall time; writes all SCRP-E07 metrics in `finishScrapeRun`
- Structured logs: `crawl_complete` (crawl_skipped) and `persist_breakdown` (persist_skipped)
- On full successful run: updates `last_full_refresh_at`
- On proxy degraded or >50% URLs blocked: increments `degraded_run_count` + `last_block_reason`

### Validation (`validate-run.ts`)

- `validateBatchHttp`: completeness ≥ 0.9; full minCountRatio 0.5; incremental 0.2
- Incremental escape when `listingsSkippedAtCrawl > 0` and completeness OK
- Legacy path unchanged: `validateBatch` with selectorHitRate when `USE_HTTP_CRAWLER=off`

### Alerts (`notify.ts`)

- `notifyOperator(..., { emailOnly: true })` for blocked-ratio alerts — skips Telegram per D-15-31
- Validation failures use existing auto-routing (Telegram or Resend)

## Deviations from Plan

None — plan executed as written.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|------------|
| T-15-09 proxy log disclosure | Proxy gate logs warning text only; no decrypted proxy_enc |
| T-15-10 empty feed soft success | validateBatchHttp before persistBatch; fail + email on gate fail |
| T-15-11 alert storms | Single email per failed/blocked run via existing notifyOperator |

## Verification

```bash
cd scraper && npx vitest run src/worker-proxy-gate.test.ts   # 9/9 pass
cd scraper && npx vitest run src/shared/validate-run.test.ts  # 10/10 pass
cd scraper && npm test                                      # 135/135 pass
```

## Self-Check: PASSED

- FOUND: scraper/src/worker-proxy-gate.ts
- FOUND: scraper/src/worker-proxy-gate.test.ts
- FOUND: scraper/src/shared/validate-run.ts
- FOUND: scraper/src/worker.ts
- FOUND: commit 5b0cc53
- FOUND: commit 0ed7f57
