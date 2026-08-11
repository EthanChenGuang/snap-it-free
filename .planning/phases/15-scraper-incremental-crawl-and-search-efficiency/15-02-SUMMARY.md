---
phase: 15-scraper-incremental-crawl-and-search-efficiency
plan: 02
subsystem: database
tags: [supabase, postgres, scraper, crawl-metrics, schema-migration]

requires:
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 01
    provides: Wave 0 HttpCrawler spike PASS + ADR lock
provides:
  - listings.crawl_content_hash column + known-set index (SCRP-E02 foundation)
  - scrape_runs efficiency metric columns (SCRP-E07 foundation)
  - scraper_global_config crawl settings columns (SCRP-E03 foundation)
  - scrape_jobs.crawl_mode incremental|full (D-15-08)
affects: [15-03, 15-05, 15-06]

tech-stack:
  added: []
  patterns:
    - "Idempotent add-column migrations matching 018_scraper_admin typed-column style"
    - "Supavisor pooler for IPv4-friendly schema push in WSL2"

key-files:
  created:
    - supabase/migrations/023_phase15_crawl_metrics.sql
  modified: []

key-decisions:
  - "max_pages default 1 per D-15-23 page-1 ship; admin may allow up to 3 later"
  - "Applied migration via Supavisor pooler after direct db host IPv6 unreachable in WSL2"

patterns-established:
  - "crawl_content_hash indexed on (source, external_id) INCLUDE for known-set load"
  - "scrape_jobs.crawl_mode defaults incremental; full crawl via job trigger"

requirements-completed: [SCRP-E02, SCRP-E03, SCRP-E07]

coverage:
  - id: D1
    description: "listings.crawl_content_hash + listings_source_crawl_hash_idx live on remote"
    requirement: SCRP-E02
    verification:
      - kind: other
        ref: "psql verify: information_schema listings.crawl_content_hash exists"
        status: pass
    human_judgment: false
  - id: D2
    description: "scraper_global_config early_stop_k, full_refresh_hours, max_pages defaults live"
    requirement: SCRP-E03
    verification:
      - kind: other
        ref: "psql verify: scraper_global_config.early_stop_k exists; max_pages default 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "scrape_runs metric columns + scrape_jobs.crawl_mode live on remote"
    requirement: SCRP-E07
    verification:
      - kind: other
        ref: "psql verify: scrape_runs.listings_skipped_at_crawl exists; scrape_jobs.crawl_mode default incremental"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-11
status: complete
---

# Phase 15 Plan 02: Crawl Metrics Schema Summary

**Wave 1 schema foundation: crawl_content_hash, scrape_runs metrics, global crawl config, and scrape_jobs.crawl_mode pushed live to Supabase**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-11T18:02:00Z
- **Completed:** 2026-08-11T18:07:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Authored `023_phase15_crawl_metrics.sql` with idempotent add-column DDL for listings, scrape_runs, scraper_global_config, and scrape_jobs
- Added `listings.crawl_content_hash` with covering index for known-set load (D-15-06, D-15-25)
- Added scrape_runs columns: listings_skipped_at_crawl, http_requests, wall_time_seconds, crawl_mode, degraded, json_field_completeness
- Added scraper_global_config typed columns: early_stop_k (default 5), full_refresh_hours (default 24), max_pages (default 1), last_full_refresh_at, last_block_reason, degraded_run_count
- Added scrape_jobs.crawl_mode with default `incremental` and CHECK constraint for incremental|full
- Applied migration to live Supabase project `wnerhajyjjmrtsdmdpzu` and verified columns via information_schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Author migration 023** - `b9d743b` (feat)
2. **Task 2: Push migration 023 to live Supabase** - deployment only (no file changes; verified via psql)

## Files Created/Modified

- `supabase/migrations/023_phase15_crawl_metrics.sql` - Phase 15 crawl metrics schema migration

## Decisions Made

- Typed columns on scraper_global_config (not jsonb) per existing 018 style and D-15-27
- max_pages default 1 per D-15-23 page-1-first ship constraint
- Applied via Supavisor session pooler (`aws-0-eu-west-3.pooler.supabase.com`) because direct `db.*` host is IPv6-only and unreachable in WSL2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Supavisor pooler instead of direct db host**
- **Found during:** Task 2 (Push migration 023)
- **Issue:** Plan verify command targets direct `db.wnerhajyjjmrtsdmdpzu.supabase.co`; WSL2 environment has IPv6 unreachable for direct host (same as Phase 14-01)
- **Fix:** Applied and verified via `aws-0-eu-west-3.pooler.supabase.com` with user `postgres.wnerhajyjjmrtsdmdpzu`, sourcing password from `.env.local`
- **Files modified:** none (connection path only)
- **Verification:** information_schema queries returned `t` for all required columns
- **Committed in:** N/A (deployment-only deviation)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Connection path only; schema identical to plan. Remote columns confirmed live.

## Issues Encountered

None beyond IPv6 connectivity (auto-fixed via pooler).

## User Setup Required

None — credentials loaded from existing `.env.local`.

## Next Phase Readiness

- Plan 15-03 can load known-set from `listings.crawl_content_hash`
- Plan 15-05 can write scrape_runs metric columns in finishScrapeRun
- Plan 15-06 can read/write scraper_global_config crawl settings and scrape_jobs.crawl_mode
- PostgREST schema cache may need Dashboard reload if REST calls 404 before cache refresh

## Self-Check: PASSED

- FOUND: supabase/migrations/023_phase15_crawl_metrics.sql
- FOUND: b9d743b
- Remote verify: listings.crawl_content_hash, scraper_global_config.early_stop_k, scrape_runs.listings_skipped_at_crawl all exist

---
*Phase: 15-scraper-incremental-crawl-and-search-efficiency*
*Completed: 2026-08-11*
