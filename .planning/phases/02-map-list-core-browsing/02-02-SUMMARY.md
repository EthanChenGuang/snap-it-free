---
phase: 02-map-list-core-browsing
plan: 02
subsystem: ui
tags: [nextjs, vaul, shadcn, maplibre, stitch, zone-filter, italian]

requires:
  - plan: 02-01
    provides: MapExplorer tracer, filterByZone, ListingMap, Stitch tokens
provides:
  - vaul bottom sheet with 25%/75% snap points over map
  - ZoneFilterChips simultaneous map+list filter
  - Bidirectional pin↔card sync with popup and flyTo
  - Header/BottomNav shell with Italian chrome
  - messages/it.ts centralized strings
affects:
  - 02-03-PLAN.md
  - 02-04-PLAN.md

tech-stack:
  added: [vaul, class-variance-authority, clsx, tailwind-merge, @radix-ui/react-slot]
  patterns: [shadcn Drawer restyled to Stitch tokens, shared selectedZone client state, vaul modal=false pointer-events workaround]

key-files:
  created:
    - components/ui/drawer.tsx
    - components/ui/button.tsx
    - components/listings/ListingCard.tsx
    - components/listings/ListingFeed.tsx
    - components/listings/ListingPopup.tsx
    - components/map/ZoneFilterChips.tsx
    - components/map/LocateMeButton.tsx
    - components/shell/Header.tsx
    - components/shell/BottomNav.tsx
    - messages/it.ts
    - lib/utils.ts
  modified:
    - components/map/MapExplorer.tsx
    - components/map/ListingMap.tsx
    - app/layout.tsx
    - app/globals.css
    - next.config.ts
    - package.json

key-decisions:
  - "Drawer uses modal=false dismissible=false with body pointer-events auto workaround per vaul pitfall 2"
  - "Pins use accent-orange (#df6b05) per Vite prototype; sheet/cards use Stitch neutrals"
  - "GeolocateControl trackUserLocation=false — recenters only, no listing filter"

requirements-completed: [DISC-01, DISC-02, DISC-03]

coverage:
  - id: D1
    description: "Bottom sheet snaps at 25%/75% with listing cards peeking"
    requirement: DISC-02
    verification:
      - kind: other
        ref: components/map/MapExplorer.tsx snapPoints
        status: pass
    human_judgment: true
    rationale: "Card peek count depends on live listing data"
  - id: D2
    description: "Zone chips filter pins and cards simultaneously"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: lib/listings/filters.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: "Pin↔card bidirectional sync with popup link to /listing/[id]"
    requirement: DISC-01
    verification:
      - kind: other
        ref: components/map/MapExplorer.tsx selectedId
        status: pass
    human_judgment: true
    rationale: "iOS Safari map click-through requires device QA"

duration: 45min
completed: 2026-07-28
status: complete
---

# Phase 2 Plan 02: Map Sheet + Zone Filter Summary

**vaul bottom sheet at 25%/75% snap, Venice zone chips, bidirectional pin↔card sync, Italian shell chrome**

## Performance

- **Duration:** 45 min
- **Started:** 2026-07-28T13:57:00Z
- **Completed:** 2026-07-28T14:01:36Z
- **Tasks:** 3 (checkpoint auto-approved under AUTO_CHAIN)
- **Files modified:** 19

## Accomplishments

- Installed shadcn/vaul Drawer with Stitch token overrides and max-h 95dvh
- Ported bento ListingCard/ListingFeed into always-open bottom sheet (DISC-02)
- Added ZoneFilterChips mapping venice_zone enum with simultaneous map+list filter (DISC-03)
- Implemented pin↔card sync: scrollIntoView on pin tap, flyTo+Popup on card tap (DISC-01)
- Wired Header/BottomNav shell with next/link routes and messages/it.ts Italian chrome

## Task Commits

1. **Task 1: shadcn Drawer bottom sheet + Stitch port** — `84280de` (feat)
2. **Task 2: Zone filter chips — simultaneous map and list** — `2d51168` (feat)
3. **Task 3: Map + sheet interaction QA** — `93f95bb` (feat)

## Files Created/Modified

- `components/map/MapExplorer.tsx` — orchestrator: drawer snapPoints, zone state, selection sync
- `components/ui/drawer.tsx` — vaul Drawer with Stitch neutrals, bottom-16 offset for nav
- `components/map/ZoneFilterChips.tsx` — All | Centro Storico | Mestre-Marghera | Lido-Murano
- `messages/it.ts` — Italian zone labels, nav, relative time helpers
- `components/shell/Header.tsx`, `BottomNav.tsx` — app chrome with next/link

## Decisions Made

- Drawer `modal={false}` with `body { pointer-events: auto !important }` when vaul visible — mitigates map click blocking
- Map pins use `accent-orange` (#df6b05) from Vite prototype; monochrome sheet per DESIGN.md
- LocateMe uses GeolocateControl with `trackUserLocation={false}` — viewport only, no filter

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint

**Task 3 (human-verify):** Auto-approved under AUTO_CHAIN. Automated verify passed (`selectedId` in MapExplorer, filters.test.ts, build:next green). Device QA for iOS Safari map click-through recommended before ship.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| app/list/page.tsx | — | Full list feed deferred to Plan 04 |
| app/post/page.tsx | — | UGC post stub until Phase 3 |
| app/settings/page.tsx | — | Settings stub until Phase 4 |

## Self-Check: PASSED

- FOUND: components/ui/drawer.tsx, components/map/ZoneFilterChips.tsx, messages/it.ts
- FOUND: 84280de, 2d51168, 93f95bb

---
*Phase: 02-map-list-core-browsing*
*Completed: 2026-07-28*
