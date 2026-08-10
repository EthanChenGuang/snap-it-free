---
status: complete
slug: map-markers-land-stitch
date: 2026-08-04
---

# Summary: Map markers on land + Stitch pin styling

## Done

- Added `lib/map/venice-land-coords.ts` with ~48 centro storico land points plus Mestre/Murano/Lido pools
- Added `lib/map/map-pin-layout.ts` for land-pool assignment, zoom-based clustering (threshold 13), and fitBounds
- Rewrote `components/map/ListingMap.tsx` with Stitch capsule pins, cluster badges, selected ring/shadow + `ListingPopup`
- Removed radial `spiderfy.ts` and tests
- Added `lib/map/map-pin-layout.test.ts` (6 tests); all map tests pass

## Verification

- Unit tests: 10/10 pass in `lib/map/`
- Browser: zoom 12 shows cluster badge (43) + 1 Mestre pin; cluster click expands to 44 capsule pins with fitBounds
