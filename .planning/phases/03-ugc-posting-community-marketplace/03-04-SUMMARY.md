---
phase: 03-ugc-posting-community-marketplace
plan: 04
subsystem: api
tags: [supabase, geolocation, rate-limit, lifecycle, street-dump, manage]

requires:
  - phase: 03-ugc-posting-community-marketplace
    plan: 01
    provides: upload/create pipeline, PinMap, ugc_select_own RLS, UgcListingShell
  - phase: 03-ugc-posting-community-marketplace
    plan: 02
    provides: conversations API for DM rate limit wiring
  - phase: 03-ugc-posting-community-marketplace
    plan: 03
    provides: HiddenReviewBanner, owner detail pattern
provides:
  - Street Dump tab with GPS seed and mandatory pin confirm before publish
  - PATCH /api/ugc/listings/[id] for owner reserved/delivered lifecycle
  - /post/manage with getOwnerListings() bulk query via ugc_select_own RLS
  - Server rate limits: 3 posts/day, 5 DM starts/hour
  - Riservato badge on map ListingPopup for claimed listings
affects: []

tech-stack:
  added: []
  patterns:
    - GPS as hint only — pin confirm required before publish (D-57, Pitfall 8)
    - Owner lifecycle compares owner_user_id from OwnerListingRow not listings_public
    - DB-backed rate limits via head count queries (D-85)

key-files:
  created:
    - components/ugc/StreetDumpForm.tsx
    - components/ugc/StreetDumpPinMap.tsx
    - components/ugc/ManageListingsClient.tsx
    - app/post/manage/page.tsx
    - app/api/ugc/listings/[id]/route.ts
    - lib/ugc/status.ts
    - lib/ugc/rate-limit.ts
  modified:
    - components/ugc/PostPageClient.tsx
    - components/ugc/PostForm.tsx
    - components/detail/UgcListingShell.tsx
    - components/listings/ListingPopup.tsx
    - lib/listings/queries.ts
    - app/api/ugc/listings/route.ts
    - app/api/messages/conversations/route.ts
    - messages/it.ts

key-decisions:
  - "Pin confirm boolean separate from GPS seed — never auto-publish Street Dump (Pitfall 8)"
  - "Owner lifecycle UI uses OwnerListingRow.owner_user_id vs session, not listings_public"
  - "Rate limits enforced server-side before INSERT on listings and conversations"

patterns-established:
  - "Shared photo/title state lifted to PostPageClient across Pubblica | Street Dump tabs"
  - "mapReservedTransition / mapDeliveredTransition pure functions shared by PATCH and tests"

requirements-completed: [UGC-02, CONT-02, CONT-03]

coverage:
  - id: D1
    description: Street Dump GPS seed with mandatory pin confirm before publish
    requirement: UGC-02
    verification:
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: true
    rationale: Live geolocation + map drag requires browser and Supabase env
  - id: D2
    description: Poster lifecycle reserved/delivered transitions
    requirement: CONT-02
    verification:
      - kind: unit
        ref: lib/ugc/status.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Delivered listing excluded from public view (expired status)
    requirement: CONT-03
    verification:
      - kind: unit
        ref: lib/ugc/status.test.ts#mapDeliveredTransition
        status: pass
    human_judgment: true
    rationale: listings_public exclusion requires applied migration 007 RLS view
  - id: D4
    description: Server rate limits on posts and DM starts
    requirement: UGC-02
    verification:
      - kind: unit
        ref: lib/ugc/rate-limit.test.ts
        status: pass
    human_judgment: false
  - id: D5
    description: Owner manage page with hidden/claimed/expired rows
    requirement: CONT-02
    verification:
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: true
    rationale: getOwnerListings RLS requires authenticated Supabase session

duration: 12min
completed: 2026-08-01
status: complete
---

# Phase 3 Plan 4: Street Dump + Lifecycle + Rate Limits Summary

**Street Dump with GPS pin confirm, owner lifecycle PATCH/manage page, and DB-backed rate limits on posts and DM starts**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-01T09:12:00Z
- **Completed:** 2026-08-01T09:24:00Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments

- Pubblica | Street Dump tabs on /post with shared photo/title; pin confirm required before publish (D-57, Pitfall 8)
- PATCH /api/ugc/listings/[id] for Segna riservato (claimed + reserved_at) and Segna consegnato (expired)
- /post/manage lists all owner UGC via getOwnerListings() including hidden/claimed/expired (ugc_select_own RLS)
- UgcListingShell owner branch uses owner_user_id from OwnerListingRow for lifecycle CTAs
- Riservato chip on map ListingPopup when status=claimed (D-69)
- assertCanPost (3/day) and assertCanStartConversation (5/hour) return 429 with Italian keys

## Task Commits

1. **Task 1: Street Dump tab** — `38f88ef` (feat)
2. **Task 2: Poster lifecycle PATCH + manage page** — `0fe9e49` (test), `aa1a4dd` (feat)
3. **Task 3: Server rate limits** — `4c8edb8` (test), `d327cb2` (feat)

## Files Created/Modified

- `components/ugc/StreetDumpForm.tsx` — GPS seed, full Venice map, confirm-before-submit
- `app/api/ugc/listings/[id]/route.ts` — owner PATCH reserved/delivered
- `app/post/manage/page.tsx` — auth-gated owner listing management
- `lib/ugc/rate-limit.ts` — DB count assertions for posts and conversations
- `lib/listings/queries.ts` — getOwnerListings() bulk query

## Decisions Made

- Pin confirm tracked separately from GPS seed — submit disabled until user confirms or drags pin
- Owner lifecycle compares session user to OwnerListingRow.owner_user_id (03-REVIEWS)
- Rate limit on conversation create only — existing conversation reopen bypasses limit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None blocking execution. `npx next build` without `--webpack` fails on maplibre Turbopack; project uses `npm run build` (webpack) per package.json.

## User Setup Required

- Existing Supabase auth and migrations 007–009 from Plans 01–03

## Next Phase Readiness

- Phase 3 requirement coverage complete (UGC-02, CONT-02, CONT-03, D-85, MOD-03 manage surface)
- Ready for phase verification and ship gate

## Self-Check: PASSED

- FOUND: .planning/phases/03-ugc-posting-community-marketplace/03-04-SUMMARY.md
- FOUND: 38f88ef
- FOUND: 0fe9e49
- FOUND: aa1a4dd
- FOUND: 4c8edb8
- FOUND: d327cb2

---
*Phase: 03-ugc-posting-community-marketplace*
*Completed: 2026-08-01*
