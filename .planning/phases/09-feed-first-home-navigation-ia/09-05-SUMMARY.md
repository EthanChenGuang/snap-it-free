---
phase: 09-feed-first-home-navigation-ia
plan: 05
subsystem: ui
tags: [maplibre, select-location, gap-closure, playwright, browse-center]
gap_closure: true

requires:
  - phase: 09-03
    provides: Select-location route and browse-center persistence
provides:
  - SelectLocationMapPane map-only split (260805-jjb pattern)
  - Lifecycle-safe browse-center hydration without mount flyTo
  - Stable readBrowseCenter snapshots for useSyncExternalStore
  - Dev chunk + Playwright verification script for UAT test 7
affects: [10-search-filter-distance, 13-select-location-flow]

tech-stack:
  added: []
  patterns:
    - "Map pane static import inside single next/dynamic boundary"
    - "Browse center storage snapshot cache keyed on raw localStorage string"

key-files:
  created:
    - components/map/SelectLocationMapPane.tsx
    - scripts/verify-select-location-dev.mjs
  modified:
    - components/map/SelectLocationClient.tsx
    - lib/browse-center/storage.ts

key-decisions:
  - "SelectLocationMapPane mirrors ListingMap scope — no nested dynamic inside dynamic chunk"
  - "readBrowseCenter caches parsed snapshot to prevent BrowseCenterProvider infinite re-render on write"

patterns-established:
  - "onLoad-gated zone-chip flyTo; initialViewState from lazy readBrowseCenter()"

requirements-completed: [NAV-03]

coverage:
  - id: D1
    description: Select-location map hydrates in dev with zone chips and Confirm flow
    requirement: NAV-03
    verification:
      - kind: e2e
        ref: "scripts/verify-select-location-dev.mjs --browser"
        status: pass
    human_judgment: false
  - id: D2
    description: Dev chunk integrity for /select-location route
    requirement: NAV-03
    verification:
      - kind: integration
        ref: "scripts/verify-select-location-dev.mjs"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-09
status: complete
---

# Phase 9 Plan 05: Select-Location Gap Closure Summary

**Closed G-09-7: `/select-location` map picker loads in dev, Confirm persists browse center and returns to feed.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments

- Split `SelectLocationMapPane` from chrome; removed mount `useEffect` flyTo race
- Fixed `readBrowseCenter` snapshot caching — Confirm no longer triggers infinite React update loop
- Added `scripts/verify-select-location-dev.mjs` (chunk probe + Playwright UAT test 7)

## Verification

- `E2E_BASE_URL=http://localhost:3003 node scripts/verify-select-location-dev.mjs --browser` — PASS
- `npx vitest run lib/browse-center/storage.test.ts` — 6/6 PASS

## UAT

- Test 7 select-location flow — **pass** (G-09-7 resolved)
