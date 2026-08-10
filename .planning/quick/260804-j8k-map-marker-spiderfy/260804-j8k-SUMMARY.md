---
status: complete
---

# Summary: Map marker spiderfy

## Fix

- Click **43** cluster → `fitBounds` zoom + spiderfy ring (~43 individual orange pins).
- Popup anchors to dispersed pin position; pin title hidden while popup open (no double tooltip).
- Tap map background collapses cluster.

## Files

- `lib/map/spiderfy.ts` + tests
- `components/map/ListingMap.tsx`

## Note

Display-layer dispersion only; scraper still writes shared centroids to DB.
