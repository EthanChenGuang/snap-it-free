---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 06
subsystem: scraper-scheduler
tags: [supabase, scheduler, worker, scrape-jobs, alerts, stagger]

requires:
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    plan: 02
    provides: runSourceScrape, config-loader, scrape_runs.source
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    plan: 04
    provides: scrape_jobs POST API, admin global config
provides:
  - 60s scheduler tick with per-source next_run_at and manual job queue
  - Per-source scrapeInProgress guard with 7-minute stagger between concurrent runs
  - coming_soon no-op with audit scrape_run and job skipped status
  - DB-driven alert routing (telegram_chat_id, alert_email) with env fallback
affects:
  - 06-07 translation pipeline
  - 06-08 admin run-now E2E verification

tech-stack:
  added: []
  patterns:
    - "runSchedulerTick polls global_pause, due sources, pending scrape_jobs every 60s (D-13, D-33)"
    - "mergeRunQueue dedupes manual jobs before cron due sources (D-19)"
    - "updateNextRunAt advances schedule only after successful cron trigger (D-14)"
    - "notifyOperator loads alert routing from scraper_global_config at send time (D-06)"

key-files:
  created: []
  modified:
    - scraper/src/scheduler.ts
    - scraper/src/scheduler.test.ts
    - scraper/src/worker.ts
    - scraper/src/config-loader.ts
    - scraper/src/alert/notify.ts
    - scraper/src/alert/notify.test.ts

key-decisions:
  - "Checkpoint option-a approved: 60s tick + DB next_run_at + scrape_jobs queue (D-13, D-33)"
  - "Manual jobs take precedence over cron due for same source_slug in mergeRunQueue"
  - "coming_soon writes partial scrape_run with 该数据源尚未接入; no operator alert"

requirements-completed:
  - SCRP-01
  - SCRP-03
  - SCRP-05
  - SCRP-06

coverage:
  - id: D1
    description: "60s scheduler tick with due sources, pending jobs, and 7-minute stagger"
    requirement: SCRP-01
    verification:
      - kind: unit
        ref: "scraper/src/scheduler.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Global pause skips all scheduled and manual runs each tick"
    requirement: SCRP-03
    verification:
      - kind: unit
        ref: "scraper/src/scheduler.test.ts#returns empty when global pause is active"
        status: pass
    human_judgment: false
  - id: D3
    description: "coming_soon sources no-op with skipped job and audit run"
    requirement: SCRP-05
    verification:
      - kind: unit
        ref: "scraper/src/worker-placeholder.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Alert notify reads telegram_chat_id and alert_email from DB with env fallback"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "scraper/src/alert/notify.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Admin interval change reflects in next_run_at within configured window"
    requirement: SCRP-01
    verification: []
    human_judgment: true
    rationale: "Requires live admin + worker against Supabase; deferred to Plan 06-08 E2E"

duration: 3min
completed: 2026-08-04
status: complete
---

# Phase 6 Plan 06: Worker Scheduler Refactor Summary

**60-second DB-driven scheduler with per-source next_run_at, scrape_jobs queue, stagger, and DB alert routing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-04T19:58:00Z
- **Completed:** 2026-08-04T20:01:39Z
- **Tasks:** 2 (checkpoint skipped — option-a pre-approved)
- **Files modified:** 6

## Accomplishments

- Replaced 90-minute single-source cron with `runSchedulerTick` every 60 seconds
- Merged due enabled sources (null or past `next_run_at`) with FIFO pending `scrape_jobs`, deduped by slug
- Staggered concurrent runs by 7 minutes; per-source in-progress guard prevents overlap
- `updateNextRunAt` advances schedule after successful cron runs using `interval_minutes`
- `coming_soon` sources finish quickly with partial audit run and skipped job message 该数据源尚未接入
- `notifyOperator` loads `telegram_chat_id` / `alert_email` from DB; tokens stay env-only

## Task Commits

1. **Task 2: Scheduler integration** - `8a8278b` (feat)
2. **Task 3: Coming-soon no-op + DB alert routing** - `54a7994` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `scraper/src/scheduler.ts` — `runSchedulerTick`, `mergeRunQueue`, `TICK_INTERVAL_MS`
- `scraper/src/scheduler.test.ts` — null next_run_at and merge queue tests
- `scraper/src/worker.ts` — 60s main loop, job status updates, coming_soon no-op
- `scraper/src/config-loader.ts` — `updateNextRunAt`, `intervalMinutes` on SourceConfig
- `scraper/src/alert/notify.ts` — DB alert routing at send time
- `scraper/src/alert/notify.test.ts` — mock supabase for routing load

## Decisions Made

- Checkpoint option-a (60s tick + DB schedule) applied per user approval
- Manual scrape_jobs win dedupe over cron-due for the same source_slug
- Cron trigger only updates `next_run_at`; manual runs do not reschedule

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Worker ready for translation pipeline hook after persistBatch (Plan 06-07)
- Manual admin interval change E2E verification remains for Plan 06-08

## Self-Check: PASSED

- FOUND: scraper/src/scheduler.ts
- FOUND: 8a8278b
- FOUND: 54a7994

---
*Phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl*
*Completed: 2026-08-04*
