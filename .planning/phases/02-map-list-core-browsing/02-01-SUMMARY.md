---
phase: 02-map-list-core-browsing
plan: 01
subsystem: ui
tags: [nextjs, maplibre, supabase, rls, stitch, vitest]

requires:
  - phase: 01-scraper-foundation-listing-data-model
    provides: listings schema, scraper writes, Supabase migrations 001-003
provides:
  - Next.js App Router map home at /
  - Supabase anon read path with RLS migration 004
  - getActiveListings query layer with expiry and zone filters
  - MapLibre ListingMap with Stitch-styled pins
  - lib/listings filters + unit tests
  - pg_cron expiry housekeeping migration 005
affects:
  - 02-02-PLAN.md
  - 02-03-PLAN.md
  - 02-04-PLAN.md

tech-stack:
  added: [next@16.2.12, maplibre-gl@6.0.0, react-map-gl@8.1.1, @supabase/ssr@0.12.3, vitest@3.2.4]
  patterns: [RSC initial fetch → client MapExplorer, defense-in-depth RLS + query predicates, Stitch token port to app/globals.css]

key-files:
  created:
    - app/page.tsx
    - app/layout.tsx
    - app/globals.css
    - components/map/MapExplorer.tsx
    - components/map/ListingMap.tsx
    - lib/listings/queries.ts
    - lib/listings/filters.ts
    - lib/supabase/server.ts
    - supabase/migrations/004_listings_public_read_rls.sql
    - supabase/migrations/005_expire_listings_cron.sql
  modified:
    - package.json
    - tsconfig.json

key-decisions:
  - "build:next uses --webpack because MapLibre 6 fails under Turbopack"
  - "ListingMap loaded via next/dynamic ssr:false for WebGL client-only render"
  - "Stitch DESIGN.md tokens (#f9f9f8 surface, #1a1c1c on-surface) replace Vite prototype hex drift"

patterns-established:
  - "Pattern: getSupabaseEnv() returns null when unset so next build succeeds without operator env"
  - "Pattern: filterByZone/filterMapListings pure functions for Plan 02 client state"

requirements-completed: [DISC-01, DISC-07, SCRP-04]

coverage:
  - id: D1
    description: "Next.js map home fetches active listings and renders MapLibre pins on Venice viewport"
    requirement: DISC-01
    verification:
      - kind: unit
        ref: lib/listings/queries.test.ts#getActiveListings predicates
        status: pass
      - kind: other
        ref: npm run build:next
        status: pass
    human_judgment: true
    rationale: "Live Supabase pins require operator env and migration 004 applied"
  - id: D2
    description: "Anon reads gated by RLS active + non-expired; query layer mirrors policy"
    requirement: SCRP-04
    verification:
      - kind: unit
        ref: lib/listings/queries.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: "Browse without login — no auth middleware on /"
    requirement: DISC-07
    verification:
      - kind: other
        ref: app/page.tsx force-dynamic RSC without auth
        status: pass
    human_judgment: false
  - id: D4
    description: "Zone-null and null-coord filtering for feeds and map pins"
    requirement: SCRP-04
    verification:
      - kind: unit
        ref: lib/listings/filters.test.ts
        status: pass
    human_judgment: false

duration: 105min
completed: 2026-07-28
status: complete
---

# Phase 2 Plan 01: Map Tracer Slice Summary

**Next.js App Router map home with Supabase anon RLS reads, query-time expiry, Stitch-aligned chrome, and MapLibre Venice pins**

## Performance

- **Duration:** 105 min
- **Started:** 2026-07-28T12:14:45Z
- **Completed:** 2026-07-28T13:55:00Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments

- Scaffolded Next.js 16 App Router alongside Vite with `dev:next` / `build:next` scripts
- Implemented RSC → MapExplorer → ListingMap read path with `getActiveListings()` predicates matching migration 004
- Ported Stitch Structured Minimalist tokens and map explorer header chrome from `DESIGN.md` / `map_explorer_notion_style/code.html`
- Added Wave 0 unit tests for zone/expiry filters and pg_cron housekeeping migration 005

## Task Commits

1. **Task 1: End-to-end map home tracer** - `9e72e20` (feat)
2. **Task 2: Wave 0 lib tests** - `2b23cac` (test)
3. **Task 3: pg_cron expiry migration** - `66699b3` (feat)

## Files Created/Modified

- `app/layout.tsx` - Stitch TopAppBar shell (手慢无 header, menu/search icons)
- `app/globals.css` - DESIGN.md @theme tokens (#f9f9f8 surface, notion-border utilities)
- `components/map/ListingMap.tsx` - OpenFreeMap liberty + black Stitch pins
- `lib/listings/queries.ts` - Centralized active listing fetch with D-36/D-40 predicates
- `supabase/migrations/004_listings_public_read_rls.sql` - Anon SELECT RLS policy
- `supabase/migrations/005_expire_listings_cron.sql` - Daily expire-stale-listings job

## Decisions Made

- `build:next` uses `--webpack` because MapLibre 6 worker blobs fail under Turbopack
- `ListingMap` loaded via `next/dynamic` with `ssr: false` for WebGL
- Excluded `src/` from root tsconfig so Next typecheck coexists with Vite prototype

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Webpack required for MapLibre production build**
- **Found during:** Task 1 verify (`npm run build:next`)
- **Issue:** Turbopack cannot resolve MapLibre dynamic worker imports
- **Fix:** Added `--webpack` flag to `build:next` script
- **Files modified:** package.json
- **Commit:** 9e72e20

**2. [Rule 3 - Blocking] Vite src excluded from Next tsconfig**
- **Found during:** Task 1 TypeScript check
- **Issue:** Next typecheck failed on Vite `src/main.tsx` import extensions
- **Fix:** Added `src` to tsconfig exclude array
- **Files modified:** tsconfig.json
- **Commit:** 9e72e20

**3. [Rule 3 - Blocking] Client-only dynamic import for ListingMap**
- **Found during:** Task 1 build
- **Issue:** MapLibre SSR bundle errors even with `'use client'`
- **Fix:** `dynamic(() => import('./ListingMap'), { ssr: false })` in MapExplorer
- **Files modified:** components/map/MapExplorer.tsx
- **Commit:** 9e72e20

---

**Total deviations:** 3 auto-fixed (all Rule 3 blocking)
**Impact on plan:** Required for green build; no scope creep.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| lib/listings/queries.ts | getListingById | Intentional stub for Plan 03 detail route |

## Issues Encountered

- `.env.local.example` is gitignored — operator env documented below instead of committed file

## User Setup Required

Configure before live pins appear:

1. Copy Supabase credentials to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Apply migrations via Supabase Dashboard SQL Editor:
   - `004_listings_public_read_rls.sql`
   - `005_expire_listings_cron.sql` (enable pg_cron extension first)
3. Run `npm run dev:next` and open `/`

## Next Phase Readiness

- Plan 02 can add bottom sheet, zone chips, and list sync using `filterByZone` / `filterMapListings`
- Plan 03 can implement `getListingById` and `/listing/[id]` route
- Operator must apply migrations and set env vars for manual pin verification

## Self-Check: PASSED

- FOUND: app/page.tsx, lib/listings/queries.ts, supabase/migrations/004_listings_public_read_rls.sql
- FOUND: 9e72e20, 2b23cac, 66699b3

---
*Phase: 02-map-list-core-browsing*
*Completed: 2026-07-28*
