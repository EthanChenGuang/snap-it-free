---
phase: 03-ugc-posting-community-marketplace
plan: 02
subsystem: api
tags: [supabase, messaging, dm, safety, vaul, rls, poll]

requires:
  - phase: 03-ugc-posting-community-marketplace
    plan: 01
    provides: migration 007, UgcListingShell, dialog primitive, auth
provides:
  - Messages API with conversation create/reopen and poll/send endpoints
  - DmDrawer bottom sheet with 10s poll and FCFS read-only notice
  - SafetyModal first-send gate and SafetyBanner in thread
  - Contatta wired on UgcListingShell with auth redirect
affects:
  - 03-03-PLAN (reports overflow menu)
  - 03-04-PLAN (rate limits on conversation starts)

tech-stack:
  added: []
  patterns:
    - Poll-based DM refresh every 10s while drawer open (D-74)
    - Duplicate conversation POST returns existing id (03-REVIEWS)
    - localStorage safety_ack per conversation (D-77)

key-files:
  created:
    - lib/messages/schemas.ts
    - lib/messages/schemas.test.ts
    - app/api/messages/conversations/route.ts
    - app/api/messages/conversations/[id]/messages/route.ts
    - components/messages/DmDrawer.tsx
    - components/messages/SafetyModal.tsx
    - components/messages/SafetyBanner.tsx
    - supabase/migrations/008_messaging_fcfs.sql
    - messages/it.test.ts
  modified:
    - components/detail/UgcListingShell.tsx
    - components/ugc/AuthPromptModal.tsx
    - messages/it.ts
    - vitest.config.ts

key-decisions:
  - "Option-a locked: conversations + messages schema with participant RLS (D-73)"
  - "FCFS via security-definer RPC listing_has_other_buyer_conversation (migration 008)"
  - "Auth redirect ?openDm=1 reopens drawer after magic-link callback"

patterns-established:
  - "Conversation reopen: SELECT existing before INSERT; conflict returns id not 409"
  - "First-send safety gate client-side with localStorage ack per conversation"

requirements-completed: [CONT-01, CONT-04, CONT-05]

coverage:
  - id: D1
    description: Message schema validation
    requirement: CONT-01
    verification:
      - kind: unit
        ref: lib/messages/schemas.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Safety and DM Italian copy keys
    requirement: CONT-05
    verification:
      - kind: unit
        ref: messages/it.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Next.js build with messages routes and DM components
    requirement: CONT-01
    verification:
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: true
    rationale: Live two-user DM poll requires migration 007+008 applied and Supabase auth

duration: 5min
completed: 2026-08-01
status: complete
---

# Phase 3 Plan 2: In-App DM + Safety Messaging Summary

**Poll-based UGC DM with conversation API, bottom sheet UI, first-send safety modal, and Contatta wired on detail**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-01T09:03:00Z
- **Completed:** 2026-08-01T09:08:00Z
- **Tasks:** 3 (1 decision pre-approved, 1 API TDD, 1 UI)
- **Files modified:** 12

## Accomplishments

- Locked D-73 option-a: conversations + messages with participant RLS
- POST /api/messages/conversations: auth, FCFS readOnly, duplicate returns `{ id, existing: true }`
- GET/POST messages with optional `since` for 10s poll incremental fetch
- DmDrawer ports ChatModal UX with Stitch tokens; SafetyModal gates first send; SafetyBanner collapsible
- Contatta on UgcListingShell opens DM; unauthenticated users get AuthPromptModal with `?openDm=1` redirect
- Reserved listings disable Contatta with helper text

## Task Commits

1. **Task 1: Confirm messaging schema (option-a pre-approved)** — no commit (checkpoint only)
2. **Task 2: Messages API** — `947b8dc` (test), `2298bbb` (feat)
3. **Task 3: DM drawer + safety UX** — `f72c08e` (feat)

## Files Created/Modified

- `app/api/messages/conversations/route.ts` — create/reopen conversation with FCFS
- `app/api/messages/conversations/[id]/messages/route.ts` — poll GET + send POST
- `components/messages/DmDrawer.tsx` — vaul drawer, quick replies, 10s poll
- `components/messages/SafetyModal.tsx` — Ho capito first-send gate
- `components/messages/SafetyBanner.tsx` — persistent collapsible safety strip
- `supabase/migrations/008_messaging_fcfs.sql` — FCFS helper bypassing participant RLS

## Decisions Made

- Option-a confirmed per 03-CONTEXT.md (D-73 conversations + messages + RLS)
- FCFS enforced via security-definer RPC because participant RLS hides other buyers' rows
- AuthPromptModal accepts `redirectTo` for DM resume after magic link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Migration 008 FCFS security-definer function**
- **Found during:** Task 2 (FCFS count blocked by conversation participant RLS)
- **Issue:** Authenticated client cannot count other buyers' conversations on same listing
- **Fix:** Added `listing_has_other_buyer_conversation` RPC in migration 008
- **Files modified:** supabase/migrations/008_messaging_fcfs.sql, app/api/messages/conversations/route.ts
- **Committed in:** 2298bbb

**2. [Rule 3 - Blocking] vitest include messages/**/*.test.ts**
- **Found during:** Task 3 (messages/it.test.ts not picked up by test:lib)
- **Fix:** Extended vitest.config.ts include pattern
- **Files modified:** vitest.config.ts
- **Committed in:** f72c08e

**3. [Rule 1 - Bug] Zod 4 UUID validation in schema test**
- **Found during:** Task 2 RED phase
- **Issue:** Test UUID `1111-1111-1111-1111` rejected by strict RFC4122 check
- **Fix:** Use v4-formatted UUID in test fixture
- **Files modified:** lib/messages/schemas.test.ts
- **Committed in:** 947b8dc

---

**Total deviations:** 3 auto-fixed (1 critical, 1 blocking, 1 bug)
**Impact on plan:** FCFS requires migration 008 apply alongside 007; no scope change.

## Issues Encountered

None blocking execution. Operator must apply migration 008 for FCFS checks in production.

## User Setup Required

- Apply migration 008 via SQL editor or `supabase db push` (after 007)
- Existing Supabase auth + magic-link redirect from Plan 01

## Next Phase Readiness

- Plan 03 can add report overflow menu and auto-hide pipeline
- Plan 04 can wire rate limits into POST conversations (D-85)
- DM drawer ready for owner lifecycle UI when poster views own listing

## Self-Check: PASSED

- FOUND: .planning/phases/03-ugc-posting-community-marketplace/03-02-SUMMARY.md
- FOUND: 947b8dc
- FOUND: 2298bbb
- FOUND: f72c08e

---
*Phase: 03-ugc-posting-community-marketplace*
*Completed: 2026-08-01*
