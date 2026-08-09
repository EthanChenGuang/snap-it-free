---
phase: 03-ugc-posting-community-marketplace
plan: 03
subsystem: api
tags: [supabase, reports, moderation, auto-hide, trigger, soft-mute]

requires:
  - phase: 03-ugc-posting-community-marketplace
    plan: 01
    provides: listing_reports DDL, getOwnerListingById, ugc_select_own RLS
  - phase: 03-ugc-posting-community-marketplace
    plan: 02
    provides: DetailTopBar pattern, AuthPromptModal, dialog primitive
provides:
  - POST /api/reports with INSERT-only path; DB trigger handles counter + auto-hide
  - Migration 009 trigger-only SECURITY DEFINER (no PostgREST RPC bypass)
  - ReportListingMenu + DetailOverflowMenu on all listing detail shells
  - HiddenReviewBanner for owner hidden UGC pending_review
  - Reporter soft-mute via localStorage excludeReportedIds on map/list
affects:
  - 03-04-PLAN (poster lifecycle UI, rate limits)

tech-stack:
  added: []
  patterns:
    - Trigger-only auto-hide — REVOKE ALL on handle_listing_report_after_insert (03-REVIEWS)
    - Route Handler INSERT listing_reports only; no client-callable increment/hide RPCs
    - localStorage reported_listings mirrors favorites storage pattern (D-84)

key-files:
  created:
    - supabase/migrations/009_report_auto_hide_trigger.sql
    - app/api/reports/route.ts
    - lib/reports/schemas.ts
    - lib/reports/auto-hide.ts
    - lib/reports/storage.ts
    - components/detail/DetailOverflowMenu.tsx
    - components/detail/ReportListingMenu.tsx
    - components/ugc/HiddenReviewBanner.tsx
  modified:
    - components/detail/DetailTopBar.tsx
    - components/detail/UgcListingShell.tsx
    - components/map/MapExplorer.tsx
    - components/listings/ListPageClient.tsx
    - lib/listings/filters.ts
    - app/listing/[id]/page.tsx
    - messages/it.ts

key-decisions:
  - "Option-a locked: authenticated reports with unique (listing_id, reporter_user_id) (D-82)"
  - "Migration 009 (not 008) for report auto-hide trigger — 008 reserved for FCFS"
  - "Auto-hide via AFTER INSERT trigger only — no GRANT EXECUTE RPCs (03-REVIEWS, T-03-11)"

patterns-established:
  - "shouldAutoHide pure function mirrors SQL threshold branching for unit tests"
  - "Report success soft-mutes listing from reporter feed via excludeReportedIds"

requirements-completed: [MOD-01, MOD-02, MOD-03]

coverage:
  - id: D1
    description: Report reason enum validation
    requirement: MOD-01
    verification:
      - kind: unit
        ref: lib/reports/schemas.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Auto-hide threshold 2 vs 3 by source
    requirement: MOD-02
    verification:
      - kind: unit
        ref: lib/reports/auto-hide.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Owner hidden pending_review banner on UGC detail
    requirement: MOD-03
    verification:
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: true
    rationale: Banner render requires owner session + hidden listing via getListingForDetail
  - id: D4
    description: Reporter soft-mute feed filter
    requirement: MOD-01
    verification:
      - kind: unit
        ref: lib/reports/storage.test.ts, lib/listings/filters.test.ts
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-01
status: complete
---

# Phase 3 Plan 3: Community Reports + Auto-Hide Summary

**Trigger-only report pipeline with source-branching thresholds, detail overflow report UI, and owner hidden-pending-review banner**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-01T09:08:00Z
- **Completed:** 2026-08-01T09:16:00Z
- **Tasks:** 3 (1 decision pre-approved, 1 TDD API, 1 UI)
- **Files modified:** 17

## Accomplishments

- Locked D-82 option-a: authenticated reports with unique constraint per reporter per listing
- Migration 009: AFTER INSERT trigger atomically increments report_count and hides at threshold (2 scraped / 3 UGC)
- POST /api/reports INSERT-only — no GRANT EXECUTE RPCs callable from browser (03-REVIEWS)
- ReportListingMenu with three Italian reasons on scraped and UGC detail via DetailOverflowMenu
- HiddenReviewBanner for owner viewing hidden UGC with pending_review
- Reporter soft-mute: excludeReportedIds wired into MapExplorer and ListPageClient

## Task Commits

1. **Task 1: Confirm listing_reports schema (option-a pre-approved)** — no commit (checkpoint only)
2. **Task 2: Reports API + auto-hide (TDD)** — `84f3179` (test), `008d820` (feat)
3. **Task 3: Report UI + owner banner + soft-mute** — `4d2b768` (feat)

## Files Created/Modified

- `supabase/migrations/009_report_auto_hide_trigger.sql` — trigger-only auto-hide; REVOKE ALL on function
- `app/api/reports/route.ts` — auth-gated INSERT; 409 on duplicate; returns softMuted
- `lib/reports/auto-hide.ts` — THRESHOLDS + shouldAutoHide pure logic
- `components/detail/ReportListingMenu.tsx` — reason radio dialog with auth gate
- `components/ugc/HiddenReviewBanner.tsx` — owner-only pending review strip

## Decisions Made

- Option-a confirmed per 03-CONTEXT.md (D-82 authenticated reports, no fingerprint)
- Migration numbered 009 — plan referenced 008 but 008 already used by messaging FCFS
- Auto-hide exclusively via DB trigger per 03-REVIEWS (T-03-11 PostgREST RPC bypass mitigation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration file renumbered 008 → 009**
- **Found during:** Task 2 (pre-implementation read)
- **Issue:** Plan referenced `008_report_auto_hide_trigger.sql` but 008 already exists for FCFS
- **Fix:** Created `009_report_auto_hide_trigger.sql` per orchestrator instruction
- **Files modified:** supabase/migrations/009_report_auto_hide_trigger.sql
- **Committed in:** 008d820

---

**Total deviations:** 1 auto-fixed (blocking — migration numbering)
**Impact on plan:** Same SQL logic; only filename differs from plan artifact path.

## Known Stubs

None — report pipeline fully wired for MOD-01/02/03 scope.

## Issues Encountered

None blocking execution. Operator must apply migration 009 alongside 007/008 for live auto-hide.

## User Setup Required

- Apply migration 009 via SQL editor or `supabase db push` (after 007 and 008)
- Existing Supabase auth from Plan 01

## Next Phase Readiness

- Plan 04 can wire poster lifecycle (reserved/gone) and rate limits (D-85)
- Report overflow menu ready on both listing shells for manual verification

## Self-Check: PASSED

- FOUND: .planning/phases/03-ugc-posting-community-marketplace/03-03-SUMMARY.md
- FOUND: 84f3179
- FOUND: 008d820
- FOUND: 4d2b768

---
*Phase: 03-ugc-posting-community-marketplace*
*Completed: 2026-08-01*
