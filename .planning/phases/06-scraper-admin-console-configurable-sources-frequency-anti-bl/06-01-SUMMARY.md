---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 01
subsystem: database
tags: [supabase, vitest, zod, aes-gcm, scraper-scheduler, rls]

requires:
  - phase: 01-scraper-foundation-listing-data-model
    provides: scrape_runs audit tables, Subito category URLs
  - phase: 04-auth-alerts-push-notifications
    provides: Supabase Auth session patterns
provides:
  - Migration 018 control-plane schema with is_operator() RLS
  - Wave 0 lib/admin pure modules and scraper scheduler contracts
  - Five seeded scraper_sources with D-52 Venice default URLs
affects:
  - 06-02 worker refactor
  - 06-03 admin middleware and API routes
  - 08 translation ingest pipeline

tech-stack:
  added: []
  patterns:
    - "App-level AES-256-GCM for proxy_enc (lib/admin/crypto.ts)"
    - "Pure allowlist guard helpers separate from async requireOperator()"
    - "DB-driven scheduler with 7-minute stagger (scraper/src/scheduler.ts)"

key-files:
  created:
    - supabase/migrations/018_scraper_admin.sql
    - lib/admin/schemas.ts
    - lib/admin/crypto.ts
    - lib/admin/require-operator.ts
    - lib/admin/url-validate.ts
    - lib/admin/translate.ts
    - lib/admin/translation-cap.ts
    - scraper/src/config-loader.ts
    - scraper/src/scheduler.ts
    - scraper/src/admin/presets.ts
    - scraper/src/worker-placeholder.ts
  modified:
    - .env.example
    - vitest.config.ts

key-decisions:
  - "Checkpoint option-a: full migration with translation columns and is_operator() RLS (D-02, D-28, D-32, D-44)"
  - "Migration numbered 018 because 017_user_locale.sql (Phase 5) already occupies 017"

patterns-established:
  - "UpdateSourceSchema enforces D-14 interval bounds 30–1440"
  - "Translation cap pauses translate only, scraping continues (D-43)"

requirements-completed:
  - SCRP-02
  - SCRP-06

coverage:
  - id: D1
    description: "Wave 0 lib/admin unit modules green (schemas, crypto, operators, URL validate, translate, cap)"
    requirement: SCRP-02
    verification:
      - kind: unit
        ref: "lib/admin/schemas.test.ts#UpdateSourceSchema"
        status: pass
      - kind: unit
        ref: "lib/admin/crypto.test.ts#roundtrips proxy URL"
        status: pass
      - kind: unit
        ref: "lib/admin/url-validate.test.ts#accepts subito.it Venice"
        status: pass
      - kind: unit
        ref: "lib/admin/translation-cap.test.ts#at cap returns pauseTranslate"
        status: pass
    human_judgment: false
  - id: D2
    description: "Scraper scheduler/config-loader/presets/worker-placeholder contracts testable"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "scraper/src/scheduler.test.ts#picks sources where next_run_at"
        status: pass
      - kind: unit
        ref: "scraper/src/admin/presets.test.ts#distinct maxPoolSize"
        status: pass
      - kind: unit
        ref: "scraper/src/worker-placeholder.test.ts#coming_soon skipped"
        status: pass
    human_judgment: false
  - id: D3
    description: "Migration 018 creates control-plane tables, RLS, seeds, audit + listing i18n columns"
    requirement: SCRP-02
    verification:
      - kind: other
        ref: "grep -c is_operator supabase/migrations/018_scraper_admin.sql (14 matches)"
        status: pass
    human_judgment: true
    rationale: "SQL must be applied on Supabase project; runtime schema not verified in CI"

duration: 5min
completed: 2026-08-04
status: complete
---

# Phase 6 Plan 01: Schema Foundation Summary

**Supabase control-plane schema (is_operator RLS, five source seeds) plus Wave 0 admin lib and scraper scheduler unit contracts**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-04T18:34:00Z
- **Completed:** 2026-08-04T18:39:00Z
- **Tasks:** 2 completed (checkpoint pre-approved)
- **Files modified:** 23

## Accomplishments

- Locked Phase 6 schema per checkpoint option-a: `operator_allowlist`, `is_operator()` RLS, admin tables, `scrape_runs.source`, listing translation columns
- Wave 0 pure modules with 29 passing unit tests across root and scraper packages
- Five sources seeded with D-52 Venice default URLs (Subito live, four coming_soon)
- `.env.example` documents OPERATOR_BOOTSTRAP_EMAILS, SCRAPER_SECRETS_KEY, translation API keys

## Task Commits

1. **Task 2: Wave 0 unit modules + failing tests** - `d05d5fc` (feat)
2. **Task 3: Migration 018 control plane schema** - `92646f2` (feat)

## Files Created/Modified

- `supabase/migrations/018_scraper_admin.sql` - Phase 6 DDL, RLS, seeds
- `lib/admin/*.ts` - Zod schemas, AES crypto, allowlist guards, URL validate, translate chain, cap check
- `scraper/src/{config-loader,scheduler,worker-placeholder}.ts` - DB merge, due-source scheduler, coming-soon no-op
- `scraper/src/admin/presets.ts` - Anti-block preset → Crawlee options
- `.env.example` - Phase 6 operator and translation env vars

## Decisions Made

- User approved checkpoint option-a: full migration 017 schema (implemented as 018 due to numbering conflict)
- Stagger default 7 minutes within D-15 5–10 range (from RESEARCH)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration renumbered 017 → 018**
- **Found during:** Task 3 (Migration 017)
- **Issue:** `supabase/migrations/017_user_locale.sql` (Phase 5) already exists
- **Fix:** Created `018_scraper_admin.sql` with identical intended schema
- **Files modified:** supabase/migrations/018_scraper_admin.sql
- **Verification:** `test -f` and `grep is_operator` pass (14 occurrences)
- **Committed in:** 92646f2

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Numbering only; schema content matches RESEARCH Pattern 1 and plan action block.

## Issues Encountered

None

## User Setup Required

**External services require manual configuration:**
- Apply `supabase/migrations/018_scraper_admin.sql` via Supabase CLI or SQL editor
- Set `OPERATOR_BOOTSTRAP_EMAILS`, `SCRAPER_SECRETS_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` in `.env.local`
- Insert bootstrap operator emails into `operator_allowlist` after migration apply

## Next Phase Readiness

- Schema and Wave 0 contracts ready for Plan 06-02 worker refactor and config pull
- Operator must apply migration 018 before live admin/worker integration

## Self-Check: PASSED

- FOUND: supabase/migrations/018_scraper_admin.sql
- FOUND: lib/admin/schemas.ts
- FOUND: scraper/src/scheduler.ts
- FOUND: commit d05d5fc
- FOUND: commit 92646f2
- Plan verify tests: 18 root + 8 scraper passed

---
*Phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl*
*Completed: 2026-08-04*
