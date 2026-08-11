---
phase: 15-scraper-incremental-crawl-and-search-efficiency
plan: 06
subsystem: admin
tags: [admin, crawl-config, proxy-health, degraded-banner, run-metrics, SCRP-E05, SCRP-E07, stitch-ui]
status: complete

requires:
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 02
    provides: migration 023 crawl config columns and scrape_runs metrics
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    plan: 05
    provides: worker metrics, proxy gate, crawl_mode job handling
provides:
  - UpdateGlobalConfigSchema crawl fields (early_stop_k, full_refresh_hours, max_pages)
  - CreateJobSchema crawl_mode for full-crawl trigger
  - Crawl efficiency card + full crawl button on Settings
  - Proxy health rows (last block reason, degraded run count)
  - Soft degraded banner on Dashboard and Settings
  - Run detail crawl metrics tiles and mode/degraded chips
affects: []

tech-stack:
  added: []
  patterns:
    - "Sticky Update configuration PATCH includes crawl efficiency fields with zod bounds"
    - "Full crawl POSTs crawl_mode=full to /api/admin/jobs without confirm dialog"
    - "showDegradedBanner = proxy unset with degraded activity OR latest subito run degraded"

key-files:
  created:
    - components/admin/DegradedBanner.tsx
  modified:
    - lib/admin/schemas.ts
    - lib/admin/types.ts
    - lib/admin/queries.ts
    - app/api/admin/config/route.ts
    - app/api/admin/jobs/route.ts
    - components/admin/SettingsClient.tsx
    - components/admin/DashboardClient.tsx
    - components/admin/RunDetailClient.tsx
    - components/admin/admin-messages.ts
    - lib/admin/format.ts

key-decisions:
  - "Degraded banner predicate uses latest Subito run degraded OR proxy unset with degraded_run_count > 0"
  - "Full crawl targets subito source_slug with crawl_mode full per D-15-08"
  - "Anti-block preset remains Source Detail only — not duplicated on Settings"

requirements-completed: [SCRP-E05, SCRP-E07]

coverage:
  - id: D1
    description: "Crawl efficiency config fields saved via admin PATCH with schema bounds"
    requirement: SCRP-E05
    verification:
      - kind: unit
        ref: "lib/admin/schemas.test.ts#UpdateGlobalConfigSchema crawl efficiency"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full crawl job enqueue via CreateJobSchema crawl_mode full"
    requirement: SCRP-E05
    verification:
      - kind: unit
        ref: "lib/admin/schemas.test.ts#CreateJobSchema crawl_mode full"
        status: pass
    human_judgment: false
  - id: D3
    description: "Proxy health and soft degraded banner on Dashboard/Settings"
    requirement: SCRP-E05
    verification: []
    human_judgment: true
    rationale: "Visual Stitch alignment and banner tone verified by operator at /admin/settings and /admin"
  - id: D4
    description: "Run detail crawl metrics tiles and mode/degraded chips with null-safe fallbacks"
    requirement: SCRP-E07
    verification:
      - kind: unit
        ref: "lib/admin/schemas.test.ts (18/18 pass)"
        status: pass
    human_judgment: true
    rationale: "Metric tile layout and chip visibility confirmed on run detail page"

metrics:
  duration: ~18min
  completed: 2026-08-11
  tasks: 3
  files: 12
---

# Phase 15 Plan 06: Admin Crawl Efficiency UI Summary

**Stitch-aligned admin surfaces for crawl K/refresh/pages config, full-crawl trigger, proxy health, soft degraded banner, and run-detail crawl metrics**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-11T18:10:00Z
- **Completed:** 2026-08-11T18:28:00Z
- **Tasks:** 3/3
- **Files modified:** 12

## Accomplishments

- Extended admin schemas, types, queries, and API routes for crawl efficiency config and job `crawl_mode`
- Settings Crawl efficiency card with K=5, hours=24, pages=1 defaults, sticky PATCH save, and 立即全量抓取 full-crawl trigger
- Proxy card extended with last block reason (暂无封禁记录 empty state) and degraded run count (always integer)
- Shared soft degraded banner on Dashboard (with settings link) and Settings per D-15-18
- Run detail metric tiles for crawl skipped, HTTP requests, wall time plus Incremental/Full and optional Degraded chips

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin schemas, queries, config PATCH, jobs crawl_mode** — `e0c48db` (test), `f205d39` (feat)
2. **Task 2: Settings crawl card, proxy health, degraded banners, run metrics UI** — `65fed4e` (feat)
3. **Task 3: Human verify admin crawl + proxy + run metrics UI** — approved (no code commit)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `components/admin/DegradedBanner.tsx` — Shared soft degraded notice (Material warning icon, outline border)
- `lib/admin/schemas.ts` — `early_stop_k`, `full_refresh_hours`, `max_pages`, `crawl_mode` zod schemas
- `lib/admin/queries.ts` — Global config + run metrics mapping, `showDegradedBanner` predicate
- `components/admin/SettingsClient.tsx` — Crawl efficiency card, proxy health rows, full crawl button
- `components/admin/DashboardClient.tsx` — Degraded banner with settings link
- `components/admin/RunDetailClient.tsx` — Crawl metric tiles and mode/degraded chips
- `components/admin/admin-messages.ts` — zh copy per 15-UI-SPEC
- `lib/admin/format.ts` — `formatWallTimeSeconds` helper

## Decisions Made

- Degraded banner shows when proxy is unset with degraded activity OR latest Subito run has `degraded=true`
- Full crawl always enqueues Subito with `crawl_mode: 'full'` (operator run trigger, no confirm dialog)
- Nullish run metrics render as `0` or `—` without throwing (UI-SPEC backstop)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Human Verification (Task 3)

Operator approved checkpoint:

- `/admin/settings` — Crawl efficiency card defaults (K=5, hours=24, pages=1), proxy health (暂无封禁记录, count 0), 立即全量抓取 button
- Automated: 18/18 schema tests, 135/135 scraper tests pass
- Plan grep checks pass

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 15 admin surface complete (SCRP-E05 display, SCRP-E07 run metrics visible)
- Phase 15 overall verification (`/gsd-verify-work 15`) can proceed

---
*Phase: 15-scraper-incremental-crawl-and-search-efficiency*
*Completed: 2026-08-11*
