---
status: complete
---

# Summary: Map markers not visible

## Diagnosis

- Supabase `listings_public`: 44 rows, all with lat/lng.
- Browser DOM: 44 `.maplibregl-marker` nodes before fix — rendering worked, UX failed.
- Only **2 unique coordinate pairs**; 42 listings stacked at Venice centroid.

## Fix

- `lib/map/group-markers.ts` — group by coords, cycle selection helper + tests.
- `components/map/ListingMap.tsx` — one marker per group, count badge, larger pin, touch-visible labels.
- `app/globals.css` — `.maplibregl-marker { z-index: 2; }`.

## Verified

- Mobile viewport: **2 markers** (was 44 stacked), centro group shows **43** badge.
- `vitest run lib/map/group-markers.test.ts` — pass.

## Follow-up (out of scope)

Scraper geo pipeline still collapses most Subito listings to municipality centroids; improving `resolveCoords` would spread pins geographically.
