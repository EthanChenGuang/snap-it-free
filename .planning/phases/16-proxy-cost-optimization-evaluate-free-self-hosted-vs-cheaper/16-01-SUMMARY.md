---
phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper
plan: 01
subsystem: scraper
tags: [proxy, crawlee, subito, degraded-run, PROXY-C04]

requires:
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    provides: Subito HttpCrawler path, recordDegradedRun, proxy gate soft-degrade
provides:
  - ProxyQuotaFatalError classification for quota/407 exhaustion
  - runSubitoCrawlWithProxyFallback single direct retry on fatal quota
  - scrape_runs.degraded + last_block_reason observability for fallback runs
affects:
  - 16-02 through 16-05 proxy cost ladder plans
  - admin Settings proxy card display

tech-stack:
  added: []
  patterns:
    - "Fatal proxy quota → ProxyQuotaFatalError → one direct retry without proxy"
    - "proxy_quota_fallback structured log with masked proxy host"

key-files:
  created:
    - scraper/src/worker-proxy-fallback.ts
    - scraper/src/worker-proxy-fallback.test.ts
  modified:
    - scraper/src/shared/proxy-errors.ts
    - scraper/src/shared/proxy-errors.test.ts
    - scraper/src/subito/crawler.ts
    - scraper/src/worker.ts
    - components/admin/admin-messages.ts
    - components/admin/SettingsClient.tsx

key-decisions:
  - "ProxyQuotaFatalError replaces CriticalError on quota path so worker can catch and retry direct"
  - "Exactly one fallback retry; second fatal propagates to fail the run (T-16-02)"
  - "recordDegradedRun skipped for blocked-ratio when fallback already recorded to avoid double increment"

patterns-established:
  - "PROXY-C04 tracer: quota fatal no longer hard-aborts incremental runs when direct crawl is acceptable"

requirements-completed: [PROXY-C04]

coverage:
  - id: D1
    description: "Proxy quota fatal errors throw ProxyQuotaFatalError instead of aborting via CriticalError"
    requirement: PROXY-C04
    verification:
      - kind: unit
        ref: "scraper/src/shared/proxy-errors.test.ts#ProxyQuotaFatalError"
        status: pass
      - kind: unit
        ref: "scraper/src/worker-proxy-fallback.test.ts#retries once without proxy"
        status: pass
      - kind: other
        ref: "! grep CriticalError scraper/src/subito/crawler.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Worker retries Subito crawl once without proxy on ProxyQuotaFatalError and marks run degraded"
    requirement: PROXY-C04
    verification:
      - kind: unit
        ref: "scraper/src/worker-proxy-fallback.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Admin Settings shows zh proxy fallback reason when last_block_reason matches fallback prefix"
    requirement: PROXY-C04
    verification: []
    human_judgment: true
    rationale: "UI label mapping requires visual confirmation in /admin/settings after a fallback run"

duration: 2min
completed: 2026-08-12
status: complete
---

# Phase 16 Plan 01: Proxy Quota Direct Fallback Summary

**ProxyQuotaFatalError with single direct crawl retry on Subito quota exhaustion, degraded run metrics, and admin last_block_reason visibility (PROXY-C04)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-12T14:51:52Z
- **Completed:** 2026-08-12T14:54:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Quota/407 fatal proxy errors throw `ProxyQuotaFatalError`; worker retries once without proxy instead of hard-aborting
- `runSubitoCrawlWithProxyFallback` emits `proxy_quota_fallback` log with masked host; exactly one retry (no infinite loop)
- Successful fallback sets `scrape_runs.degraded=true`, updates `last_block_reason`, and logs `proxy_fallback: true` on `crawl_complete`
- Admin Settings displays zh `proxyQuotaFallbackReason` when stored reason contains `proxy quota direct fallback`

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): End-to-end proxy quota fatal → direct fallback** - `4b9850c` (test), `9e00a67` (feat)
2. **Task 2: Degraded metrics + admin last_block_reason** - `ce111f4` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `scraper/src/shared/proxy-errors.ts` - `ProxyQuotaFatalError`, `isProxyQuotaFatalError`
- `scraper/src/worker-proxy-fallback.ts` - Single-retry fallback helper with structured logging
- `scraper/src/subito/crawler.ts` - `proxyErrorHandler` throws `ProxyQuotaFatalError`
- `scraper/src/worker.ts` - Wires fallback helper, degraded merge, `recordDegradedRun`, `proxy_fallback` log
- `components/admin/admin-messages.ts` - `proxyQuotaFallbackReason` zh string
- `components/admin/SettingsClient.tsx` - Maps fallback reason to zh display

## Decisions Made

- Used `ProxyQuotaFatalError` subclass so only quota-classified fatals trigger fallback (T-16-01)
- Blocked-ratio `recordDegradedRun` skipped when fallback already recorded to avoid double `degraded_run_count` increment
- Fallback reason string includes `proxy quota direct fallback` for admin prefix matching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PROXY-C04 tracer complete; ready for 16-02-PLAN.md (next cost-ladder step)
- Manual verification: inject exhausted proxy URL, trigger manual job, confirm degraded run + admin last_block_reason

## Self-Check: PASSED

- FOUND: scraper/src/worker-proxy-fallback.ts
- FOUND: scraper/src/worker-proxy-fallback.test.ts
- FOUND: scraper/src/shared/proxy-errors.ts
- FOUND: 4b9850c, 9e00a67, ce111f4

---
*Phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper*
*Completed: 2026-08-12*
