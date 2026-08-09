---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 07
subsystem: ui
tags: [nextjs, supabase, admin, scrape-runs, scrape-rejects, stitch]

requires:
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    provides: AdminShell, operator auth, scrape_runs source column
provides:
  - /admin/runs run history with source filter and empty state
  - /admin/runs/[id] run detail with metrics and log excerpt
  - /admin/rejects browser with dual filters and JSON preview
affects:
  - 06-08
  - 06-09

tech-stack:
  added: []
  patterns:
    - "Server components fetch runs/rejects; client components handle filters and expandable JSON"
    - "UTC display with Europe/Rome title tooltip (D-16)"
    - "Reject reason zh label mapping from raw scraper strings"

key-files:
  created:
    - app/admin/runs/page.tsx
    - app/admin/runs/[id]/page.tsx
    - app/admin/rejects/page.tsx
    - components/admin/RunsListClient.tsx
    - components/admin/RunDetailClient.tsx
    - components/admin/RejectsClient.tsx
    - lib/admin/format.ts
    - lib/admin/reject-reasons.ts
  modified:
    - lib/admin/queries.ts
    - lib/admin/types.ts
    - components/admin/admin-messages.ts

key-decisions:
  - "Expandable table rows for JSON preview instead of side drawer (plan backstop max-h-48 scroll)"
  - "Export button rendered disabled UI-only per MVP scope"
  - "Partial run status shown as 部分成功 distinct from failed"

patterns-established:
  - "Admin audit pages: server fetch + client filter state with Stitch table/empty-state layouts"
  - "Reject preview truncates in list; full JSON in expandable row with overflow scroll"

requirements-completed: [SCRP-06]

coverage:
  - id: D1
    description: "/admin/runs lists scrape_runs with source filter, populated table, and empty state"
    requirement: SCRP-06
    verification:
      - kind: other
        ref: "test -f app/admin/runs/page.tsx && test -f components/admin/RunsListClient.tsx"
        status: pass
    human_judgment: true
    rationale: "Populated table behavior requires live scrape_runs data"
  - id: D2
    description: "/admin/runs/[id] shows metrics, log excerpt, and rejects deep link"
    requirement: SCRP-06
    verification:
      - kind: other
        ref: "test -f app/admin/runs/[id]/page.tsx"
        status: pass
    human_judgment: true
    rationale: "Detail metrics require operator session against real run row"
  - id: D3
    description: "/admin/rejects filters by source/reason with truncated preview and expandable JSON"
    requirement: SCRP-06
    verification:
      - kind: other
        ref: "test -f app/admin/rejects/page.tsx && test -f components/admin/RejectsClient.tsx"
        status: pass
    human_judgment: true
    rationale: "Filter narrowing and preview truncation need seeded reject rows"

duration: 8min
completed: 2026-08-04
status: complete
---

# Phase 06 Plan 07: Run History, Run Detail, Rejects Browser Summary

**Run audit surfaces at /admin/runs, /admin/runs/[id], and /admin/rejects with Stitch layouts, Supabase queries, and D-53 ports from scraper-admin reference views**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-04T20:02:00Z
- **Completed:** 2026-08-04T20:10:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Run history page with 全部数据源 filter, UTC timestamps + Rome tooltip, skeleton-ready table, and 暂无运行记录 empty state
- Run detail page with status chip, four-metric grid, log excerpt, and link to `/admin/rejects?run_id=` when rejects > 0
- Rejects browser with source/reason filters, truncated preview column, expandable JSON (max-h-48 scroll), and disabled export UI

## Task Commits

1. **Task 1: Run history list — filter, table, empty state** - `12f1bb8` (feat)
2. **Task 2: Run detail page — metrics + log excerpt** - `19f6161` (feat)
3. **Task 3: Rejects browser — filters + truncated preview** - `31d9628` (feat)

## Files Created/Modified

- `app/admin/runs/page.tsx` - Server page fetching scrape runs
- `app/admin/runs/[id]/page.tsx` - Run detail with notFound guard
- `app/admin/rejects/page.tsx` - Rejects browser with run_id search param
- `components/admin/RunsListClient.tsx` - Ported RunHistoryView with Stitch tokens
- `components/admin/RunDetailClient.tsx` - Ported RunDetailView metric grid and log section
- `components/admin/RejectsClient.tsx` - Ported RejectsView filters and expandable JSON
- `lib/admin/queries.ts` - getScrapeRuns, getScrapeRunById, getScrapeRejects
- `lib/admin/format.ts` - UTC/Rome timestamp and selector rate helpers
- `lib/admin/reject-reasons.ts` - zh reason label mapping per UI-SPEC

## Decisions Made

- Expandable inline JSON rows instead of scraper-admin side drawer to satisfy backstop scroll container
- Export button disabled (UI-only) per MVP plan scope
- `partial` status labeled 部分成功 for operator clarity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Run/reject audit pages ready for operator verification after Subito run
- AdminShell rejects badge count still defaults to 0 until Plan 08 wires count query

## Self-Check: PASSED

- FOUND: app/admin/runs/page.tsx
- FOUND: app/admin/runs/[id]/page.tsx
- FOUND: app/admin/rejects/page.tsx
- FOUND: components/admin/RunsListClient.tsx
- FOUND: components/admin/RunDetailClient.tsx
- FOUND: components/admin/RejectsClient.tsx
- FOUND: 12f1bb8
- FOUND: 19f6161
- FOUND: 31d9628

---
*Phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl*
*Completed: 2026-08-04*
