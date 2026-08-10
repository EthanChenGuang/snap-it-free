---
status: complete
task: filter-mode-mutual-exclusivity
completed: 2026-08-10
---

# Quick Task: Filter Mode Mutual Exclusivity

## Summary

Introduced `mode: 'city' | 'map'` in filter prefs with mutual exclusivity between city filter and map pin + radius. Removed radius controls from FilterSheet; added radius pills, circle overlay, and radar sweep on `/select-location`.

## Behavior

- **City mode** (Filter sheet Apply): clears browse center, disables radius, filters by city enum
- **Map mode** (Confirm on select-location): city=all, radius enabled, browse center saved
- **Category-only apply** in map mode preserves pin + radius

## Files

- `lib/filter-prefs/storage.ts` — `mode` field, radius up to 100km
- `lib/filter-prefs/mode-transitions.ts` — applyCityFilterPrefs, applyMapFilterPrefs, clearMapFilterPrefs
- `lib/geo/radius-circle.ts` — circle, radar sector, bounds
- `components/listings/FilterSheet.tsx` — radius removed
- `components/map/SelectLocationMapPane.tsx` — GeoJSON circle + radar
- `components/map/SelectLocationClient.tsx` — radius pills + confirm sync
- `FeedFilterContext`, `FeedHeaderRow`, `useDistanceCenter` — mode-aware pipeline

## Tests

272 passing in scoped run (+ mode/city/radius/geo tests)
