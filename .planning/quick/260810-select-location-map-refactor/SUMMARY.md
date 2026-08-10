---
status: complete
task: select-location-map-refactor
completed: 2026-08-10
---

# Quick Task: Select Location Map Refactor

## Summary

Refactored `/select-location` to match target design: flow header with back + title, coordinate-based red pin marker (not viewport-locked), tap-to-move with drop animation, GPS/localStorage/default init chain, custom locate-me button, floating bottom card with Stitch styling, map bottom padding.

## Changes

- `SelectLocationClient.tsx` — header, floating card, init resolution, confirm → `writeBrowseCenter` + `router.back()`
- `SelectLocationMapPane.tsx` — Marker at coords, map click handler, custom locate button, padding
- `SelectLocationRedPin.tsx` — red SVG pin with drop animation
- `messages/{zh,en,it}.ts` — title, selectedLocationLabel, locateMe keys
- `app/globals.css` — `@keyframes pin-drop`

## Verification

- Typecheck: no new errors in changed files
- `messages/key-parity.test.ts` passes
