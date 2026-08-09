---
phase: 02-map-list-core-browsing
plan: 05
subsystem: ui
tags: [nextjs, favorites, supabase, gap-closure]
gap_closure: true

requires:
  - plan: 02-04
    provides: FavoritesPageClient, client-queries, storage
provides:
  - Safe favorites hydrate without localStorage wipe on fetch failure
  - Selective prune via pruneMissingFavoriteIds
  - Favorites-by-ID fetch without zone filter
affects:
  - Phase 4 auth favorites migration

tech-stack:
  added: []
  patterns: [selective favorites prune, static NEXT_PUBLIC env inlining]

key-files:
  created:
    - .planning/phases/02-map-list-core-browsing/02-05-PLAN.md
  modified:
    - lib/supabase/env.ts
    - lib/listings/queries.ts
    - lib/listings/client-queries.ts
    - lib/favorites/storage.ts
    - lib/favorites/storage.test.ts
    - components/listings/FavoritesPageClient.tsx

key-decisions:
  - "pruneMissingFavoriteIds only drops requested IDs absent from Supabase response — never wipes on empty fetch"
  - "Favorites-by-ID query omits zone filter so explicitly saved listings hydrate even when zone tagging lags"
  - "G-02-11 zone-null production data deferred to Phase 1 operator action"

requirements-completed: [DISC-06]

gaps-closed:
  - G-02-7
  - G-02-8

gaps-deferred:
  - G-02-11
    reason: "Production listings lack venice_zone — operator must run Phase 1 zone tagging"

duration: 8min
tasks: 3
---

# Phase 02 Plan 05 — Favorites Gap Closure

## Summary

Closed UAT gaps G-02-7 and G-02-8 by fixing the favorites hydration pipeline: static Supabase env access for client bundle inlining, selective prune that never wipes localStorage on empty/error fetch, and favorites-by-ID query without zone filter.

## What Changed

1. **env.ts** — Static `process.env.NEXT_PUBLIC_*` access (already partially applied; confirmed)
2. **storage.ts** — Added `pruneMissingFavoriteIds(requestedIds, returnedIds)` 
3. **client-queries.ts** — Removed `.not('zone', 'is', null)` from favorites fetch
4. **queries.ts** — Added `getListingsByIds` server helper for future RSC use
5. **FavoritesPageClient.tsx** — Uses selective prune; preserves storage on fetch failure

## Self-Check

- [x] `npm run test:lib` — 18/18 passed
- [x] pruneMissingFavoriteIds preserves IDs on empty fetch
- [x] G-02-11 documented as operator/data deferral

## Deviations

None.

## Issues Encountered

Gap closure plan did not exist prior to execution — created 02-05-PLAN.md inline from UAT.md gaps section.
