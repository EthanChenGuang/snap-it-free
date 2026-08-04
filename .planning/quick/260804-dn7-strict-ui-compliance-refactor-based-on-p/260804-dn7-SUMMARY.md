---
quick_id: 260804-dn7
phase: quick-260804-dn7
plan: 01
subsystem: ui
tags: [stitch, map, header, bottom-nav, listing-card]
requires: []
provides:
  - map-search-ui shared store
  - FloatingMapSearch overlay
  - Stitch-compliant header / cards / bottom nav
affects:
  - components/shell/Header.tsx
  - components/map/MapExplorer.tsx
  - components/listings/ListingCard.tsx
  - components/shell/BottomNav.tsx
tech-stack:
  added: []
  patterns:
    - useSyncExternalStore client store without provider
    - Stitch map_explorer Notion port (section-by-section)
key-files:
  created:
    - lib/ui/map-search-ui.ts
    - components/map/FloatingMapSearch.tsx
  modified:
    - components/shell/Header.tsx
    - components/map/MapExplorer.tsx
    - components/listings/ListingCard.tsx
    - components/ui/drawer.tsx
    - components/shell/BottomNav.tsx
    - messages/it.ts
decisions:
  - Favorites remain menu-only; header heart replaced by search per Stitch TopAppBar
  - Zone chips hidden until search is open (matches floating-search prototype)
  - Source/free chips monochrome (no accent-orange on card face)
  - Drawer handle uses bg-outline for visibility on surface
metrics:
  duration: 3min
  completed: "2026-08-04"
status: complete
---

# Phase quick-260804-dn7 Plan 01: Strict Stitch UI Compliance Summary

Header search toggles a floating map search + zone chips overlay; listing cards and bottom nav match the map_explorer Notion Stitch prototype.

## What Changed

### Task 1 — End-to-end header search → floating map search
- Added `lib/ui/map-search-ui.ts` (`get`/`set`/`toggle`/`subscribe` + `useMapSearchOpen`) shared by Header and MapExplorer; closes when leaving `/`.
- Header: text-only `手慢无` title (no orange logo square); search button toggles overlay (or navigates to `/` then opens).
- `FloatingMapSearch` ports prototype input + `ZoneFilterChips`; Italian `messages.map.searchPlaceholder`.
- MapExplorer: chips no longer always visible; title filter when query non-empty.

### Task 2 — Notion listing cards + visible sheet drag handle
- `ListingCard`: image-first, no outer bordered card chrome; selected via image ring; monochrome source/free chips.
- Drawer handle: `h-1.5 w-12 rounded-full mx-auto my-space-sm bg-outline`.

### Task 3 — Bottom nav Stitch active state
- Active: `text-primary font-bold` without `bg-surface-container` pill.
- Icons always FILL 0 / wght 400; labels `text-label-sm`.

## Commits

| Hash | Message |
|------|---------|
| 97e2911 | feat(260804-dn7): header search toggles floating map search |
| e4004b9 | feat(260804-dn7): Notion listing cards and visible sheet handle |
| b117d7e | feat(260804-dn7): Stitch bottom nav active state |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: lib/ui/map-search-ui.ts
- FOUND: components/map/FloatingMapSearch.tsx
- FOUND: components/shell/Header.tsx
- FOUND: components/listings/ListingCard.tsx
- FOUND: components/ui/drawer.tsx
- FOUND: components/shell/BottomNav.tsx
- FOUND: 97e2911, e4004b9, b117d7e
