---
phase: 01-scraper-foundation-listing-data-model
plan: 04
subsystem: scraper
tags: [validation, alerting, cron, docker, proxy, scrape-runs]

# Dependency graph
requires:
  - phase: 01-03
    provides: normalizeRawListing pipeline, logReject, worker multi-listing crawl
provides:
  - validateBatch gate before persist with bootstrap median
  - scrape_runs lifecycle (start/finish on success and failure)
  - notifyOperator with UI-SPEC email/Telegram copy
  - 90-minute CRON_ENABLED schedule with overlap guard
  - Docker deploy + proxy rotation via PROXY_URL
affects:
  - Phase 2 map UI (real listing supply)

# Tech tracking
tech-stack:
  added: [resend, node-telegram-bot-api]
  patterns:
    - "validateBatch → finishScrapeRun failed + notifyOperator on gate failure; zero listing upserts (D-20)"
    - "persistBatch loops normalizeRawListing with scrape_run_id on rejects"
    - "Telegram preferred over Resend when TELEGRAM_BOT_TOKEN set"
    - "setInterval 90min cron — no */90 cron minute field (D-02)"

key-files:
  created:
    - scraper/src/alert/notify.ts
    - scraper/src/alert/notify.test.ts
    - scraper/Dockerfile
    - scraper/README.md
    - scraper/.env.example
  modified:
    - scraper/src/shared/validate-run.test.ts
    - scraper/src/shared/persist.ts
    - scraper/src/worker.ts
    - scraper/src/subito/crawler.ts
    - scraper/src/config.ts
    - scraper/package.json

key-decisions:
  - "Package legitimacy verified via npm registry before install (resend, node-telegram-bot-api)"
  - "setInterval for 90-minute cadence instead of node-cron invalid */90 expression"
  - "Telegram channel preferred when both Telegram and Resend env vars present"
  - "Live alert delivery checkpoint deferred — operator must set alerting env and simulate soft-block"

patterns-established:
  - "Failed batch: scrape_runs failed row + alert + zero persistBatch (D-19, D-20)"
  - "Success path silent per UI-SPEC — no notifyOperator call"
  - "ALERT_DELIVERY_FAILED logged to stderr on send failure; no retry loop"

requirements-completed: [SCRP-01, SCRP-06]

coverage:
  - id: D1
    description: "Batch gate rejects low count and low selector rate"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "scraper/src/shared/validate-run.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Operator alert copy matches UI-SPEC subject and metrics block"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "scraper/src/alert/notify.test.ts"
        status: pass
    human_judgment: true
    rationale: "Live email/Telegram delivery requires operator alerting credentials"
  - id: D3
    description: "90-minute cron and Docker deploy documented"
    requirement: SCRP-01
    verification:
      - kind: unit
        ref: "scraper/src/worker.ts scraper/Dockerfile"
        status: pass
    human_judgment: true
    rationale: "Live Subito crawl + Supabase persist blocked on missing operator env"

# Metrics
duration: 12min
completed: 2026-07-28
status: complete
---

# Phase 01 Plan 04: Batch Validation, Alerting & Production Deploy Summary

**Batch validation gate with scrape_runs audit trail, UI-SPEC operator alerts, proxy-enabled crawl, 90-minute cron, and Docker worker deploy**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-28T09:23:00Z
- **Completed:** 2026-07-28T09:35:00Z
- **Tasks:** 3 auto (+ 2 checkpoints: package verify automated; alert delivery deferred to operator)
- **Files modified:** 11

## Accomplishments

- `validateBatch` gate runs after crawl, before `persistBatch`; bootstrap median 50 when no prior runs
- `startScrapeRun` / `finishScrapeRun` / `getTrailingMedians` write full audit rows to `scrape_runs`
- `persistBatch` normalizes, persists, and tallies inserted/updated/skipped/rejected with scrape_run_id on rejects
- `notifyOperator` sends Resend email or Telegram with exact UI-SPEC copy; truncates Telegram detail at 500 chars when message exceeds 4096
- Proxy rotation via Crawlee `ProxyConfiguration` when `PROXY_URL` set; session retired on blocked page title
- `CRON_ENABLED=true` runs scrape every 90 minutes with overlap guard; Dockerfile + README for Fly.io/Hetzner

## Task Commits

1. **Batch validation gate and persistBatch** — `96fd884` (feat)
2. **Scrape_runs lifecycle and operator alerting** — `84f5766` (feat)
3. **Production proxy, cron schedule, and Docker deploy** — `00a2e9d` (feat)

## Package Legitimacy Verification

Verified via `npm view` before install:

| Package | Registry repo | Status |
|---------|---------------|--------|
| resend | github.com/resend/resend-node | approved |
| node-telegram-bot-api | github.com/yagop/node-telegram-bot-api | approved |
| node-cron | github.com/node-cron/node-cron | not installed — used setInterval instead |

## Operator Setup Required

Before live production runs:

1. **Supabase:** Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; apply migrations
2. **Proxy:** Set `PROXY_URL` to residential rotating endpoint (D-04)
3. **Alerting:** Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` OR `RESEND_API_KEY` + `ALERT_FROM` + `ALERT_TO`
4. **Soft-block alert test:** Force validation failure (low count) and confirm alert received; verify zero listing mutations for that run

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Checkpoint Notes

- **Package legitimacy (Task 1):** Verified programmatically via npm registry; repos match RESEARCH audit
- **Alert delivery (Task 4):** Unit tests verify copy/truncation; live delivery requires operator env — not verified in this session

## Issues Encountered

- **Supabase credentials still missing:** Live worker persist and scrape_runs writes cannot be verified until operator sets env (inherited from Plans 02–03)
- **Live alert delivery:** Checkpoint 4 requires operator to configure Resend or Telegram and simulate soft-block

## Next Phase Readiness

- Phase 1 ingestion pipeline code-complete; operator must configure env and verify one live crawl + one alert simulation
- Phase 2 can consume `listings` table once scraper runs successfully
- Full category list remains 3 SPIKE-validated Veneto regalo URLs from SPIKE-NOTES

---
*Phase: 01-scraper-foundation-listing-data-model*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: scraper/src/shared/validate-run.ts
- FOUND: scraper/src/alert/notify.ts
- FOUND: scraper/Dockerfile
- FOUND: 96fd884
- FOUND: 84f5766
- FOUND: 00a2e9d
