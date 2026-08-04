---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 04
subsystem: scraper-admin-dashboard
tags: [supabase, dashboard, api-routes, stitch, d-03, d-17, d-19]

requires:
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    plan: 03
    provides: AdminShell, operator middleware, lib/admin/queries tracer
provides:
  - Interactive dashboard with global pause, Run now, alerts, footer stats
  - GET/PATCH /api/admin/config and POST /api/admin/jobs
  - PATCH /api/admin/sources/[slug] for Subito enable toggle
affects:
  - 06-05 sources list extends same PATCH route
  - 06-06 worker consumes scrape_jobs queue

tech-stack:
  added: []
  patterns:
    - "getOperatorSession() gate for all /api/admin/* mutations"
    - "DashboardClient client island with server-fetched initial props"
    - "Footer stats wired through AdminShell layout queries"

key-files:
  created:
    - components/admin/DashboardClient.tsx
    - components/admin/SourceCard.tsx
    - app/api/admin/config/route.ts
    - app/api/admin/jobs/route.ts
    - app/api/admin/sources/[slug]/route.ts
  modified:
    - app/admin/page.tsx
    - app/admin/layout.tsx
    - components/admin/AdminShell.tsx
    - lib/admin/schemas.ts
    - lib/admin/schemas.test.ts
    - lib/admin/queries.ts
    - lib/admin/types.ts
    - lib/admin/require-operator.ts
    - lib/admin/require-operator.test.ts

key-decisions:
  - "Coming soon Run now inserts scrape_jobs with status skipped and API message"
  - "Max one pending job per live source enforced in POST /api/admin/jobs (T-06-09)"
  - "Footer stats rendered in AdminShell from layout fetch, not DashboardClient"

requirements-completed:
  - SCRP-06

coverage:
  - id: T1
    description: "lib/admin/schemas.test.ts passes with config and job schemas"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "npm test -- lib/admin/schemas.test.ts"
        status: pass
    human_judgment: false
  - id: T2
    description: "DashboardClient and SourceCard exist; five-card grid with global pause"
    requirement: SCRP-06
    verification:
      - kind: other
        ref: "test -f components/admin/DashboardClient.tsx && test -f components/admin/SourceCard.tsx"
        status: pass
    human_judgment: false
  - id: T3
    description: "PATCH /api/admin/sources/[slug] enables Subito toggle with coming_soon guard"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "lib/admin/require-operator.test.ts canEnableSource"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-04
status: complete
---

# Phase 6 Plan 04: Admin Dashboard Summary

**Status-first operator dashboard with global pause, Subito Run now queue, recent alerts, and footer metrics per Stitch admin_dashboard**

## One-liner

Interactive admin home with PATCH global config, POST scrape_jobs queue, five source cards, and footer stats wired to Supabase.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2a0e934 | Admin API — global config PATCH + scrape_jobs POST |
| 2 | cb0b341 | DashboardClient + SourceCard + queries + layout footer |
| 3 | 2d21479, b1364c6 | Source enable toggle PATCH with TDD guard tests |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Intentional Adjustments

**Footer stats via AdminShell layout** — Plan listed `footerStats` on DashboardClient props; footer lives in AdminShell per Stitch shell contract, so stats are fetched in `app/admin/layout.tsx` and passed to AdminShell instead.

## Self-Check: PASSED

- FOUND: components/admin/DashboardClient.tsx
- FOUND: components/admin/SourceCard.tsx
- FOUND: app/api/admin/config/route.ts
- FOUND: app/api/admin/jobs/route.ts
- FOUND: app/api/admin/sources/[slug]/route.ts
- FOUND: 2a0e934, cb0b341, 2d21479, b1364c6
