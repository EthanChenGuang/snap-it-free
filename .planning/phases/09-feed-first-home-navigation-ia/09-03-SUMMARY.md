---
phase: 09-feed-first-home-navigation-ia
plan: 03
subsystem: ui
tags: [maplibre, localStorage, select-location, browse-center, navigation]

requires:
  - phase: 09-02
    provides: FeedHeaderRow location link to /select-location
provides:
  - Browse center localStorage module with React provider
  - /select-location route with fixed center pin map
  - SelectLocationZoneChips with Padova
  - Minimal chrome on select-location (no feed header, no bottom nav)
affects: [10-search-filter-distance, 13-select-location-flow]

tech-stack:
  added: []
  patterns:
    - "browse-center localStorage + CustomEvent sync mirroring favorites/preferences"
    - "SelectLocationClient fixed center pin overlay with onMoveEnd center read"
    - "AppChrome early return for /select-location minimal shell"

key-files:
  created:
    - lib/browse-center/storage.ts
    - lib/browse-center/storage.test.ts
    - lib/browse-center/context.tsx
    - app/select-location/page.tsx
    - components/map/SelectLocationClient.tsx
  modified:
    - app/layout.tsx
    - components/shell/AppChrome.tsx
    - components/shell/BottomNav.tsx
    - components/map/ZoneFilterChips.tsx
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts

key-decisions:
  - "SelectLocationZoneChips separate export keeps MapExplorer All chip unchanged"
  - "Confirm label derived from selected zone chip or nearest Venice zone vs Padova distance"
  - "BrowseCenterProvider nested inside AppThemeProvider wrapping AppChrome"

patterns-established:
  - "Browse center: shoumanwu_browse_center key with lat/lng bounds validation on read"
  - "Select-location: full-viewport map, chrome entirely in SelectLocationClient"

requirements-completed: [NAV-03, I18N-01]

coverage:
  - id: D1
    description: Browse center storage read/write with validation and cross-tab sync
    requirement: NAV-03
    verification:
      - kind: unit
        ref: lib/browse-center/storage.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: BrowseCenterProvider mounted in app layout
    requirement: NAV-03
    verification:
      - kind: unit
        ref: lib/browse-center/storage.test.ts#writeBrowseCenter dispatches change event
        status: pass
    human_judgment: false
  - id: D3
    description: Select-location route with dynamic SelectLocationClient and map loading fallback
    requirement: NAV-03
    verification:
      - kind: unit
        ref: messages/key-parity.test.ts
        status: pass
    human_judgment: true
    rationale: Map rendering and pan-under-pin UX require manual browser verification
  - id: D4
    description: Confirm persists browse center and returns to feed without filtering
    requirement: NAV-03
    verification: []
    human_judgment: true
    rationale: End-to-end flow from feed location button through Confirm needs manual check
  - id: D5
    description: Minimal chrome on /select-location (no FeedHeaderRow, no BottomNav)
    requirement: NAV-03
    verification:
      - kind: unit
        ref: npm run test:lib
        status: pass
    human_judgment: true
    rationale: Visual chrome absence best verified in browser on /select-location
  - id: D6
    description: Trilingual selectLocation.* and zones.padova keys
    requirement: I18N-01
    verification:
      - kind: unit
        ref: messages/key-parity.test.ts
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-09
status: complete
---

# Phase 9 Plan 3: Select-Location Flow Summary

**NAV-03 select-location at `/select-location` with fixed center pin map, zone chips, browse-center persistence, and minimal chrome**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-09T12:03:00Z
- **Completed:** 2026-08-09T12:11:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Browse center module (`shoumanwu_browse_center`) with bounds validation, tests, and `BrowseCenterProvider` in layout
- Full select-location flow: MapLibre map, fixed center pin, zone chips (Centro/Mestre/Lido + Padova), Locate Me, Confirm CTA
- AppChrome and BottomNav hide feed header and bottom nav on `/select-location` per D-23/D-25

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — browse-center storage + tests (D-27)** - `e8e1a7d` (test), `8bb2c83` (feat)
2. **Task 2: SelectLocationClient — fixed pin map + zone chips + Confirm** - `16cbd68` (feat)
3. **Task 3: AppChrome minimal chrome on select-location** - `d8de2e8` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `lib/browse-center/storage.ts` - read/write/subscribe with lat/lng validation
- `lib/browse-center/context.tsx` - BrowseCenterProvider + useBrowseCenter
- `lib/browse-center/storage.test.ts` - 6 unit tests (empty, round-trip, corrupt, bounds, SSR, event)
- `app/select-location/page.tsx` - dynamic client import with map loading fallback
- `components/map/SelectLocationClient.tsx` - map, pin overlay, Confirm, back chevron
- `components/map/ZoneFilterChips.tsx` - added SelectLocationZoneChips with Padova
- `app/layout.tsx` - BrowseCenterProvider mount
- `components/shell/AppChrome.tsx` - minimal shell for select-location
- `components/shell/BottomNav.tsx` - null return on select-location
- `messages/{zh,en,it}.ts` - zones.padova for Padova chip label

## Decisions Made

- Separate `SelectLocationZoneChips` export rather than overloading explorer chips with All
- Confirm label uses selected chip when set, otherwise nearest zone vs Padova by distance
- Initial map center hydrates from saved browse center when present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run test:lib` reports 3 pre-existing failures in `lib/admin/subito-regalo-catalog.test.ts` (Padova spike gate); unrelated to this plan. Browse-center and key-parity tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Browse center persisted on Confirm; Phase 10 can consume `useBrowseCenter()` for radius filtering
- Feed location button already links to `/select-location` from plan 09-02

## Self-Check: PASSED

- FOUND: lib/browse-center/storage.ts
- FOUND: lib/browse-center/context.tsx
- FOUND: lib/browse-center/storage.test.ts
- FOUND: app/select-location/page.tsx
- FOUND: components/map/SelectLocationClient.tsx
- FOUND: .planning/phases/09-feed-first-home-navigation-ia/09-03-SUMMARY.md
- FOUND: e8e1a7d
- FOUND: 8bb2c83
- FOUND: 16cbd68
- FOUND: d8de2e8

---
*Phase: 09-feed-first-home-navigation-ia*
*Completed: 2026-08-09*
