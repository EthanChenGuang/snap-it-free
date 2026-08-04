---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 03
subsystem: scraper-admin-auth-shell
tags: [supabase, middleware, admin-shell, rls, stitch]

requires:
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    plan: 02
    provides: Minimal /admin dashboard, lib/admin/queries tracer
provides:
  - /admin middleware session refresh + operator allowlist gate (D-48, D-49)
  - Stitch AdminShell with zh nav and Material Symbols (D-35, D-36, D-53)
  - Operator RLS session reads in lib/admin/queries
affects:
  - 06-04 admin API routes and scheduler
  - 06-05+ admin sub-routes wired into AdminShell nav

tech-stack:
  added: []
  patterns:
    - "middleware.ts matcher /admin + /admin/:path* with @supabase/ssr cookie refresh"
    - "Non-operator silent redirect to / without admin chrome (D-49)"
    - "AdminShell ports scraper-admin nav union with Stitch tokens"

key-files:
  created:
    - middleware.ts
    - lib/supabase/middleware.ts
    - components/admin/AdminShell.tsx
    - components/admin/admin-messages.ts
  modified:
    - app/admin/layout.tsx
    - app/admin/page.tsx
    - lib/admin/queries.ts
    - app/globals.css

key-decisions:
  - "Middleware uses operator_allowlist ilike select under authenticated RLS"
  - "AdminShell badge counts default to 0 until translation/rejects queries land"
  - "Dashboard load error keyed off globalStatus null, not empty sources"

requirements-completed:
  - SCRP-06
  - SCRP-07

coverage:
  - id: T1
    description: "middleware.ts exists; require-operator unit tests pass"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "lib/admin/require-operator.test.ts"
        status: pass
    human_judgment: false
  - id: T2
    description: "AdminShell has six nav items including Rejects; no lucide under components/admin"
    requirement: SCRP-07
    verification:
      - kind: other
        ref: "test -f components/admin/AdminShell.tsx && rg lucide components/admin"
        status: pass
    human_judgment: false
  - id: T3
    description: "lib/admin/queries uses createClient not createServiceClient"
    requirement: SCRP-06
    verification:
      - kind: other
        ref: "lib/admin/queries.ts imports createClient"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-04
status: complete
---

# Phase 6 Plan 03: Admin Auth Gate + Stitch Shell Summary

**Operator-gated /admin with Supabase middleware and canonical Stitch AdminShell using Chinese nav labels**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-04T18:39:00Z
- **Completed:** 2026-08-04T18:43:00Z
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- `middleware.ts` refreshes Supabase session on `/admin` paths; logged-out users redirect to `/post?next=/admin` (D-48)
- Authenticated non-operators silently redirect to `/` with no admin chrome (D-49)
- Confirmed no `/admin` href in consumer BottomNav or Settings (D-50)
- `AdminShell` ports scraper-admin nav structure with six zh labels, w-64 sidebar, h-16 TopAppBar, Material Symbols only
- Dashboard queries use operator session client under RLS; load failure shows 无法加载配置

## Task Commits

1. **Task 1: Admin middleware — session refresh + operator allowlist** - `3f770e8` (feat)
2. **Task 2: AdminShell — port scraper-admin shell, restyle to Stitch** - `4169ce8` (feat)
3. **Task 3: Switch admin queries to operator RLS session client** - `9890bcc` (feat)

## Files Created/Modified

- `middleware.ts` — /admin auth + allowlist gate
- `lib/supabase/middleware.ts` — createServerClient updateSession helper
- `components/admin/AdminShell.tsx` — Stitch sidebar + TopAppBar shell
- `components/admin/admin-messages.ts` — zh nav copy constants
- `app/admin/layout.tsx` — wraps children in AdminShell with operator email
- `lib/admin/queries.ts` — createClient RLS reads with []/null error fallbacks
- `app/admin/page.tsx` — load error UI per UI-SPEC
- `app/globals.css` — `.admin-skeleton` pulse utility

## Decisions Made

- Middleware allowlist check via authenticated select on `operator_allowlist` (RLS filters non-operators to empty)
- Footer stats and nav badges show placeholders until Plans 05–08 wire live counts

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| components/admin/AdminShell.tsx | footer | Footer stats show "—" until dashboard metrics API (Plan 05+) |
| components/admin/AdminShell.tsx | props | pendingTranslationsCount/rejectsCount default 0 until queue/rejects queries |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: middleware-gate | middleware.ts | New trust boundary — session + allowlist before /admin render |

## Issues Encountered

- Manual auth redirect flow (/post?next=/admin) does not auto-open AuthPromptModal — user must sign in via existing post/settings auth surfaces; callback safeNextPath handles return to /admin

## User Setup Required

- Apply migration `018_scraper_admin.sql` and seed at least one operator email in `operator_allowlist`
- Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for middleware session refresh

## Next Phase Readiness

- Admin shell ready for Plans 04–09 sub-routes and mutation APIs
- Plan 06-04 can add Route Handlers with requireOperator on /api/admin/*

## Self-Check: PASSED

- FOUND: middleware.ts
- FOUND: components/admin/AdminShell.tsx
- FOUND: lib/admin/queries.ts
- FOUND: commit 3f770e8
- FOUND: commit 4169ce8
- FOUND: commit 9890bcc
- Plan verify: require-operator tests 6/6 pass; no lucide in components/admin

---
*Phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl*
*Completed: 2026-08-04*
