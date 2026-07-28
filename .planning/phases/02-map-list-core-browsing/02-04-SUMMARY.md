---
phase: 02-map-list-core-browsing
plan: 04
subsystem: ui
tags: [nextjs, favorites, localStorage, poll, italian, toast, stitch]

requires:
  - plan: 02-03
    provides: DetailTopBar, ListingCard, ListingPopup, share helpers
provides:
  - localStorage favorites with shoumanwu_favorites key
  - /favorites and /list routes with zone filters
  - useListingsPoll 5-minute client refresh
  - Post and Settings login-optional stubs
  - shadcn-style toast for share and favorite feedback
affects:
  - Phase 3 UGC posting
  - Phase 4 auth migration from localStorage favorites

tech-stack:
  added: [@radix-ui/react-toast]
  patterns: [localStorage pre-auth favorites, client poll refresh, Supabase hydrate by ID with prune]

key-files:
  created:
    - lib/favorites/storage.ts
    - lib/favorites/useFavorites.ts
    - lib/favorites/storage.test.ts
    - lib/listings/client-queries.ts
    - lib/listings/useListingsPoll.ts
    - components/listings/FavoriteButton.tsx
    - components/listings/FavoritesPageClient.tsx
    - components/listings/ListPageClient.tsx
    - components/ui/toast.tsx
    - components/ui/toaster.tsx
    - app/favorites/page.tsx
  modified:
    - app/list/page.tsx
    - app/post/page.tsx
    - app/settings/page.tsx
    - app/layout.tsx
    - components/detail/DetailTopBar.tsx
    - components/listings/ListingCard.tsx
    - components/listings/ListingPopup.tsx
    - components/map/MapExplorer.tsx
    - components/shell/Header.tsx
    - messages/it.ts
    - package.json
    - README.md

key-decisions:
  - "Favorites key shoumanwu_favorites stable for Phase 4 migration import"
  - "Shared useListingsPoll at 300000ms for map and list; manual Aggiorna on list only"
  - "Header heart replaces search affordance linking to /favorites"
  - "npm run dev/build default to Next.js; Vite scripts renamed dev:vite/build:vite"

requirements-completed: [DISC-06, DISC-07]

coverage:
  - id: D1
    description: "Favorite UUIDs persist in localStorage and toggle from card, popup, and detail bar"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: lib/favorites/storage.test.ts
        status: pass
    human_judgment: true
    rationale: "Cross-surface heart UI and reload persistence need device QA"
  - id: D2
    description: "/favorites hydrates saved listings and prunes expired IDs"
    requirement: DISC-06
    verification:
      - kind: other
        ref: app/favorites/page.tsx
        status: pass
    human_judgment: true
    rationale: "Empty state and prune behavior need Supabase-connected manual check"
  - id: D3
    description: "/list full feed with zone filter and 5-minute poll refresh"
    requirement: DISC-07
    verification:
      - kind: other
        ref: lib/listings/useListingsPoll.ts
        status: pass
    human_judgment: true
    rationale: "Poll interval timing needs browser observation"
  - id: D4
    description: "Post and Settings stubs accessible without login or middleware"
    requirement: DISC-07
    verification:
      - kind: other
        ref: npx next build --webpack
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-28
status: complete
---

# Phase 2 Plan 04: Favorites and Login-Optional Shell Summary

**localStorage favorites with Supabase hydration, /list and /favorites routes, 5-min poll refresh, and Italian Post/Settings stubs without auth gates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-28T14:06:00Z
- **Completed:** 2026-07-28T14:11:00Z
- **Tasks:** 3/3
- **Files modified:** 22

## Accomplishments

- Implemented `shoumanwu_favorites` localStorage storage with toggle, prune, and cross-component sync hook (D-46, D-47)
- Wired FavoriteButton on list cards, map popup, and detail top bar; toast feedback for share and favorites (D-53)
- Built `/favorites` with Supabase `.in(id, ids)` hydration and stale ID pruning (D-48)
- Built `/list` full-screen feed with zone chips, Aggiorna refresh, and shared `useListingsPoll(300000)` (D-30, D-38)
- Added Post and Settings Italian stubs with no auth middleware (D-49, D-50, DISC-07)
- Switched primary npm scripts to Next.js; documented env vars in README

## Task Commits

1. **Task 1: localStorage favorites storage + hook** — `631289c` (test), `fb42f68` (feat)
2. **Task 2: Favorites route + full list feed** — `671ae55` (feat)
3. **Task 3: Login-optional stubs + Phase 2 cutover** — `c0b4e28` (feat)

## Decisions Made

- Header heart icon links to `/favorites` instead of search (Stitch shell affordance)
- Manual refresh button on `/list` only; map relies on poll interval per RESEARCH discretion
- `.env.local.example` updated on disk but gitignored — README documents Supabase vars instead

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required beyond existing Supabase env vars.

## Next Phase Readiness

- Phase 2 browsing scope complete (DISC-01–07)
- Phase 3 can replace Post stub with UGC flow
- Phase 4 must migrate `shoumanwu_favorites` to Supabase-backed user favorites

## Self-Check: PASSED

- FOUND: lib/favorites/storage.ts, app/favorites/page.tsx, app/list/page.tsx, lib/listings/useListingsPoll.ts
- FOUND: 631289c, fb42f68, 671ae55, c0b4e28

---
*Phase: 02-map-list-core-browsing*
*Completed: 2026-07-28*
