# Quick Task: Select Location — Radius Pills, Pin & Radar Polish

Fix radius pill interaction, restore red pin marker, and refine radar/circle visuals on `/select-location`.

## Tasks

1. **Radius pills** — Move into map pane overlay (`z-30`, `pointer-events-auto`, `stopPropagation`); sync state + `fitBounds` on change
2. **Pin marker** — HTML overlay projected from map coords (`z-25`), above GeoJSON layers; avoid Marker inside Map (radar RAF re-render issue)
3. **Radar animation** — Imperative `source.setData()` loop instead of React state per frame
4. **Visual palette** — Minimalist dark/white: fill ≤0.08, subtle outline, dual-layer soft radar beam
