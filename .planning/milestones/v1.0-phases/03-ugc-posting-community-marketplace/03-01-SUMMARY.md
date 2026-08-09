---
phase: 03-ugc-posting-community-marketplace
plan: 01
subsystem: api
tags: [supabase, sharp, magic-link, ugc, maplibre, rls, exif]

requires:
  - phase: 02-map-list-core-browsing
    provides: MapLibre map shell, listings_public reads, Stitch UI tokens, Italian messages
provides:
  - Migration 007 with ugc_select_own RLS, ugc-photos bucket, messaging/report DDL
  - Magic-link auth with persistent SSR cookies and /auth/callback
  - Quick Post upload + create pipeline with server-side EXIF strip and zone tagging
  - UGC native detail route (UgcListingShell) and Community/Reserved badges on map/list
  - Wave 0 unit tests for geo, schemas, EXIF strip, and auth gate
affects:
  - 03-02-PLAN (DM drawer, SafetyModal on dialog primitive)
  - 03-03-PLAN (getOwnerListingById, owner hidden rows)
  - 03-04-PLAN (Street Dump tab, poster lifecycle UI)

tech-stack:
  added: [sharp, "@turf/boolean-point-in-polygon", "@radix-ui/react-dialog"]
  patterns:
    - Route Handlers + Zod + RLS for UGC writes (D-86)
    - Owner-aware detail via getOwnerListingById before listings_public fallback
    - Dynamic MapLibre import (ssr:false) for pin placement mini-map

key-files:
  created:
    - supabase/migrations/007_ugc_messaging_reports.sql
    - app/api/ugc/upload/route.ts
    - app/api/ugc/listings/route.ts
    - app/auth/callback/route.ts
    - lib/geo/zone-tag.ts
    - lib/supabase/auth.ts
    - components/ugc/PostForm.tsx
    - components/detail/UgcListingShell.tsx
  modified:
    - lib/supabase/server.ts
    - lib/listings/queries.ts
    - app/listing/[id]/page.tsx
    - app/post/page.tsx

key-decisions:
  - "Option-a locked: magic link auth + migration 007 + RLS (D-54, D-66, D-87)"
  - "listing_reports uses reporter_user_id only — no fingerprint column (03-REVIEWS)"
  - "Scraper lat/lng bounds (45.0–45.7 / 12.1–12.6) in CreateListingSchema (03-REVIEWS)"

patterns-established:
  - "Server-side photo pipeline: multipart → sharp EXIF strip → Storage ugc-photos/{userId}/{uuid}.jpg"
  - "Dual detail route: getOwnerListingById (base table + ugc_select_own) then listings_public fallback"

requirements-completed: [UGC-01, UGC-03, UGC-04]

coverage:
  - id: D1
    description: Quick Post tracer — auth-gated upload, server zone tag, listing create, UGC detail
    requirement: UGC-01
    verification:
      - kind: unit
        ref: lib/geo/zone-tag.test.ts#returns centro_storico
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: true
    rationale: End-to-end magic link → post → map pin requires applied migration 007 and Supabase env
  - id: D2
    description: Server-side EXIF strip before Storage write
    requirement: UGC-03
    verification:
      - kind: unit
        ref: lib/ugc/exif-strip.test.ts#re-encodes input through sharp jpeg pipeline
        status: pass
    human_judgment: false
  - id: D3
    description: Login required to post — requireAuth returns null without session; APIs return 401
    requirement: UGC-04
    verification:
      - kind: unit
        ref: lib/ugc/auth-gate.test.ts#returns null when no session user exists
        status: pass
    human_judgment: false
  - id: D4
    description: CreateListingSchema rejects out-of-bounds coordinates
    requirement: UGC-01
    verification:
      - kind: unit
        ref: lib/ugc/schemas.test.ts#rejects lat outside Venice bounds
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-08-01
status: complete
---

# Phase 3 Plan 1: Quick Post Tracer Summary

**Magic-link auth with SSR cookies, migration 007 RLS/Storage, EXIF-safe upload pipeline, and UGC native detail branching**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-01T08:58:00Z
- **Completed:** 2026-08-01T09:04:00Z
- **Tasks:** 3 (1 decision pre-approved, 1 tracer, 1 test wave)
- **Files modified:** 37

## Accomplishments

- Locked option-a: email magic link + migration 007 + RLS for UGC write paths (D-54, D-66, D-87)
- Migration 007 adds ugc_select_own SELECT policy, ugc-photos bucket insert, claimed UGC in listings_public, messaging/report DDL
- Quick Post UI (Stitch post_free_item port): photo upload, zone chips, draggable PinMap, inline AuthPromptModal
- POST /api/ugc/upload strips EXIF via sharp; POST /api/ugc/listings tags zone server-side and rejects out-of-Venice pins
- /listing/[id] branches UGC → UgcListingShell vs subito → ScrapedListingShell with owner-aware getListingForDetail
- Wave 0 tests green for zone-tag, schemas, exif-strip, requireAuth

## Task Commits

1. **Task 1: Confirm Phase 3 auth scope (option-a pre-approved)** — no commit (checkpoint only)
2. **Task 2: End-to-end Quick Post tracer** — `0956212` (feat)
3. **Task 3: Wave 0 unit tests** — `5b49076` (test)

## Files Created/Modified

- `supabase/migrations/007_ugc_messaging_reports.sql` — UGC columns, RLS, Storage bucket, conversations/messages/listing_reports DDL
- `app/api/ugc/upload/route.ts` — authenticated multipart upload with EXIF strip
- `app/api/ugc/listings/route.ts` — authenticated listing create with tagZone
- `lib/supabase/server.ts` — fixed setAll cookie persistence (Pitfall 1)
- `components/ugc/PostForm.tsx` — Quick Post Stitch UI with magic-link gate
- `components/detail/UgcListingShell.tsx` — native UGC detail without Subito CTAs

## Decisions Made

- Option-a confirmed per 03-CONTEXT.md (D-54 magic link, D-66 schema, D-87 RLS)
- listing_reports reporter_user_id only — no reporter_fingerprint (03-REVIEWS)
- Venice bounds from scraper schema, not RESEARCH tighter example (03-REVIEWS)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Split ZONE_CENTERS from zone-tag to avoid node:fs in client bundle**
- **Found during:** Task 2 (next build)
- **Issue:** PostForm imported zone-tag.ts which pulls readFileSync into client chunk
- **Fix:** Added `lib/geo/zone-centers.ts`; PostForm imports centers only
- **Files modified:** lib/geo/zone-centers.ts, lib/geo/zone-tag.ts, components/ugc/PostForm.tsx, components/ugc/PinMap.tsx
- **Committed in:** 0956212

**2. [Rule 3 - Blocking] Dynamic PinMap import with ssr:false**
- **Found during:** Task 2 (next build / MapLibre)
- **Issue:** MapLibre in SSR caused module resolution errors
- **Fix:** `dynamic(() => import('./PinMap'), { ssr: false })` matching MapExplorer pattern
- **Files modified:** components/ugc/PostForm.tsx
- **Committed in:** 0956212

**3. [Rule 1 - Bug] Feature<Point> type for booleanPointInPolygon**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** Generic Feature type incompatible with turf Coord
- **Fix:** Typed point as Feature<Point>
- **Files modified:** lib/geo/zone-tag.ts
- **Committed in:** 0956212

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** Build/runtime fixes only; no scope change.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `components/detail/UgcListingShell.tsx` | Contatta button | Disabled stub until Plan 02 DM (D-71 deferred one plan) |

## Issues Encountered

None blocking execution. Operator must apply migration 007 and configure Supabase magic-link redirect before live Quick Post.

## User Setup Required

Per PLAN.md user_setup:
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Apply migration 007 via SQL editor or `supabase db push`
- Enable Email auth provider; add redirect URL `http://localhost:3000/auth/callback`

## Next Phase Readiness

- Plan 02 can wire Contatta → DmDrawer on dialog primitive and SafetyModal
- getOwnerListingById + ugc_select_own RLS ready for MOD-03 hidden banner in Plan 03
- Street Dump tab deferred to Plan 04 (D-57)

## Self-Check: PASSED

- FOUND: .planning/phases/03-ugc-posting-community-marketplace/03-01-SUMMARY.md
- FOUND: 0956212
- FOUND: 5b49076

---
*Phase: 03-ugc-posting-community-marketplace*
*Completed: 2026-08-01*
