---
quick_id: 260805-jjb
status: complete
---

# Summary: Map stuck on loading

## Fix

- Removed the inner `dynamic(ListingMap)` in `MapExplorer` — map now loads with the same chunk as the explorer UI instead of a second fetch that could hang.
- Import `@/lib/map/maplibreWorker` at the top of `MapHomeClient` so `setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')` runs before any map component mounts.
- Reordered imports in all map components: worker config → CSS → `react-map-gl/maplibre`.

## Files changed

- `components/map/MapHomeClient.tsx`
- `components/map/MapExplorer.tsx`
- `components/map/ListingMap.tsx`
- `components/ugc/PinMap.tsx`
- `components/ugc/StreetDumpPinMap.tsx`
- `components/detail/DetailLocationMap.tsx`

## Verify

Hard-refresh the homepage (or clear site data if a stale service worker is present). The map should paint within one loading cycle instead of staying on "地图加载中…" with the drawer already visible.

First dev compile of the combined chunk may still take ~20–30 s; that is expected in webpack dev mode, not a hang.
