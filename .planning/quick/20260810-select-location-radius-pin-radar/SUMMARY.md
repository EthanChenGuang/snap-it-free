---
status: complete
completed: 2026-08-10
---

# Select Location Radius / Pin / Radar — Summary

## Completed

- **Root cause:** init `useEffect` depended on `applyMarkerPosition`, which was recreated whenever `radiusKm` changed — pill clicks updated state then immediately reset via `setRadiusKm(resolveInitialRadiusKm())`. Fixed with one-time mount effect + `radiusKmRef`.
- Radius pills consolidated inside `SelectLocationMapPane` with `z-30`, `pointer-events-auto`, and click `stopPropagation` so map canvas no longer intercepts taps
- Pill selection updates `radiusKm`, recalculates circle GeoJSON, and triggers `fitBounds` via stabilized `onFitBounds` effect
- Red pin restored as projected HTML overlay (`SelectLocationPinOverlay`, `z-25`) anchored bottom at `{ lat, lng }`
- Radar sweep uses imperative `setData()` animation (no per-frame React re-renders that broke Marker)
- Minimalist dark/white overlay palette: white fill 0.06, dark outline 0.18, dual soft radar sectors (outer 0.045 / inner 0.08)

## Files Changed

- `components/map/SelectLocationMapPane.tsx`
- `components/map/SelectLocationClient.tsx`
