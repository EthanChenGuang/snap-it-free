---
quick_id: 260805-jjb
status: complete
---

# Quick Task: Map stuck on loading

Homepage showed "地图加载中…" indefinitely while the bottom sheet with listings rendered.

## Root cause

Two issues compounded:

1. **Nested `next/dynamic`** — `MapHomeClient` dynamically imported `MapExplorer`, which dynamically imported `ListingMap` (maplibre ~758 KB gzipped chunk). The outer chunk loaded (drawer visible) but the inner map chunk often never finished on mobile/ngrok, leaving the map area on the loading placeholder forever.

2. **MapLibre worker import order** — `setWorkerUrl()` ran after `react-map-gl/maplibre` in several files. Worker URL must be configured before MapLibre initializes.

## Tasks

### Task 1: Remove nested dynamic import
- **files:** `components/map/MapExplorer.tsx`
- **action:** Import `ListingMap` directly; `MapExplorer` is already client-only via the outer dynamic wrapper

### Task 2: Configure worker before maplibre loads
- **files:** `MapHomeClient.tsx`, `ListingMap.tsx`, `PinMap.tsx`, `StreetDumpPinMap.tsx`, `DetailLocationMap.tsx`
- **action:** Import `@/lib/map/maplibreWorker` first; call `setWorkerUrl` in `MapHomeClient` before any map chunk loads
