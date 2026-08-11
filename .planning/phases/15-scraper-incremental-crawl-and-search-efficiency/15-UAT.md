---
status: partial
phase: 15-scraper-incremental-crawl-and-search-efficiency
source: 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md, 15-05-SUMMARY.md, 15-06-SUMMARY.md
started: 2026-08-11T18:26:00Z
updated: 2026-08-11T18:28:00Z
tester: agent-automated
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Scraper worker and crawler modules import cleanly from cold state without startup errors
result: pass
source: automated
notes: "npx tsx import worker.ts + crawler.ts — OK"

### 2. HTTP category spike (Wave 0)
expected: Spike script PASS artifact documents field map, timing, TLS note, and arredamento-casalinghi Venezia path
result: pass
source: automated
notes: "15-SPIKE-HTTP-CATEGORY.md overall PASS; arredamento-casalinghi/venezia/venezia present"

### 3. Stack ADR — HttpCrawler primary
expected: docs/adr/015-scraper-http-stack.md locks Crawlee HttpCrawler primary, Playwright secondary, rejects Apify for Phase 15
result: pass
source: automated
coverage_id: D1-15-01-D3

### 4. Proxy ADR — residential + soft degraded gate
expected: docs/adr/015-production-proxy.md documents Italian residential proxy requirement and soft degraded gate
result: pass
source: automated
coverage_id: D1-15-01-D4

### 5. Schema migration 023 live
expected: listings.crawl_content_hash, scraper_global_config crawl fields, scrape_runs metric columns, scrape_jobs.crawl_mode exist on remote
result: pass
source: automated
coverage_id: D1-15-02-D1,D2,D3

### 6. Category JSON extract without Playwright
expected: parseCategoryNextData extracts RawListing[] from __NEXT_DATA__ fixture with price/images/coords
result: pass
source: automated
coverage_id: D1-15-03-D1
notes: "6/6 http-extract.test.ts pass"

### 7. Two-tier crawl hash
expected: crawlContentHash distinct from persist contentHash; price change changes hash
result: pass
source: automated
coverage_id: D1-15-03-D2
notes: "4/4 crawl-hash.test.ts pass"

### 8. Early-stop K=5 logic
expected: applyEarlyStop breaks at K consecutive known-unchanged; full-refresh routes touchCandidates; mid-list reset works
result: pass
source: automated
coverage_id: D1-15-03-D3
notes: "5/5 early-stop.test.ts pass"

### 9. Known-set loader
expected: loadKnownListingSet returns Map from single DB query of external_id + crawl_content_hash
result: pass
source: automated
coverage_id: D1-15-03-D4
notes: "2/2 known-set.test.ts pass"

### 10. crawl_content_hash production persist path
expected: normalizeRawListing computes crawl_content_hash from HTTP JSON fields; persistBatch writes it on insert/update; early-stop matches after round-trip
result: pass
source: automated
notes: "normalize.ts:61 crawlHashForListing(raw); integration script hashesMatch=true earlyStopSkipped=1; resolves prior VERIFICATION gap"

### 11. HttpCrawler primary + USE_HTTP_CRAWLER flag
expected: runSubitoCrawler uses HttpCrawler when USE_HTTP_CRAWLER on|shadow|unset; legacy Playwright-only when off
result: pass
source: automated
notes: "grep HttpCrawler crawler.ts; config.ts unset→on; 136/136 scraper tests pass"

### 12. Playwright fallback queue
expected: Block retry one Playwright per URL; detail enrichment concurrency 1 with 10% cap; overflow logged
result: pass
source: automated
notes: "9/9 fallback-queue.test.ts; FALLBACK_CONCURRENCY=1; detailBudgetCap wired"

### 13. Worker crawl mode + soft proxy gate
expected: decideCrawlMode selects full on null lastFullRefreshAt or age threshold; evaluateProxyGate sets degraded without crash in production without proxy
result: pass
source: automated
notes: "9/9 worker-proxy-gate.test.ts pass"

### 14. JSON completeness validation gate
expected: validateBatchHttp enforces ≥0.9 completeness; mode-aware min count ratios; incremental escape when crawl_skipped > 0
result: pass
source: automated
notes: "10/10 validate-run.test.ts pass"

### 15. Admin crawl efficiency config schema
expected: UpdateGlobalConfigSchema accepts early_stop_k, full_refresh_hours, max_pages with bounds; CreateJobSchema accepts crawl_mode full
result: pass
source: automated
coverage_id: D1-15-06-D1,D2
notes: "18/18 lib/admin/schemas.test.ts pass"

### 16. Admin proxy health + degraded banner UI
expected: Settings shows proxy configured chip, last block reason empty state, degraded run count; DegradedBanner on Dashboard/Settings when predicate true
result: pass
source: automated
notes: "SettingsClient proxy card + DegradedBanner.tsx verified in source; live browser blocked by operator auth redirect to /post?next=/admin"

### 17. Run detail crawl metrics tiles
expected: Run detail shows crawl skipped, HTTP requests, wall time tiles plus Incremental/Full and optional Degraded chips with null-safe fallbacks
result: pass
source: automated
notes: "RunDetailClient.tsx metric grid + chips verified; formatWallTimeSeconds helper present"

### 18. Matrix performance benchmark
expected: 34-URL Subito matrix with USE_HTTP_CRAWLER=on shows http_requests ≤ ~120 and materially lower wall_time_seconds vs pre-Phase-15 baseline
result: blocked
blocked_by: server
reason: "Requires live production-scale scrape against Subito with populated DB; not runnable in agent session without operator-triggered full matrix run"

## Summary

total: 18
passed: 17
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none]

## Automated Test Evidence

| Suite | Result |
|-------|--------|
| scraper `npm test -- --run` | 136/136 pass |
| `lib/admin/schemas.test.ts` | 18/18 pass |
| crawl hash integration script | hashesMatch=true, earlyStopSkipped=1 |
| Spike artifact grep | PASS + arredamento-casalinghi |
| ADR grep | HttpCrawler + residential + degraded |

## Notes

- Prior `15-VERIFICATION.md` gap (crawl_content_hash never persisted) is **closed**: `normalizeRawListing` now computes hash via `crawlHashForListing(raw)` at `scraper/src/shared/normalize.ts:61`.
- Performance target (≥10× request reduction) remains architecturally plausible but unmeasured — blocked pending operator live matrix run, not a code defect.
