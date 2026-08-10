# Quick Task 260804-ifm: Map markers not visible

**Goal:** Diagnose why the map shows no listing pins despite 44 items in the bottom sheet, then fix.

## Root cause

1. **Collocated coordinates:** 42/44 scraped Subito rows share identical lat/lng (`45.434, 12.338`) from municipality-centroid fallback, so 44 separate `Marker` components stacked into one 16px dot.
2. **Touch-invisible labels:** Pin titles used `opacity-0` until hover — useless on mobile.
3. **Small pin chrome:** 16px orange dot with thin border was easy to miss against the map.

Data pipeline and MapLibre worker were already healthy (44 markers in DOM, map tiles loading).

## Tasks

1. Group listings by rounded coordinates; render one marker per group with count badge.
2. Enlarge pins, add z-index on `.maplibregl-marker`, show labels on touch / when selected.
3. Cycle selection through collocated listings on repeated tap.
