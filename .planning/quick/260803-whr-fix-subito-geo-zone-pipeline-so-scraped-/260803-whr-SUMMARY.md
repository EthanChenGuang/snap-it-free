---
status: complete
quick_id: 260803-whr
completed: 2026-08-03
---

# Quick Task 260803-whr Summary

**Task:** fix Subito geo/zone pipeline so scraped free items surface in Elenco  
**Result:** 42 `source='subito'` rows visible in `listings_public` (baseline was 0–1)

## Commits

| Commit | Task |
|--------|------|
| `8c6f24e` | Recon Venice URL form + coordinate sources |
| `ca573b6` | Repair geo resolution + zone polygons |
| `9956629` | Narrow crawl, geo gate, measurement script |

## Recon findings

- **Winning URL form:** `/annunci-veneto/regalo/{cat}/venezia/venezia/` (comune-scoped)
  - arredamento 30 / elettrodomestici 3 / bambini-giocattoli 9 cards
- **Coordinate source that works:** municipality centroid from `[class*="location"]` → `"Venezia (VE)"` (6/6 sampled pages)
- **Embedded coords:** `__NEXT_DATA__`, JSON-LD, raw lat/lng, map URLs — all 0/6
- **Root cause of prior null zones:** `span[class*="caption"]` matched the insertion *date*, not the town

## Code changes

- Prefer `[class*="location"]` + body province scan; URL-slug locality before comune name (Marghera vs Venezia)
- Expand centroid table; rename Lido → "Lido di Venezia" (blocks Jesolo false match)
- Widen `mestre-marghera` south and `lido-murano` north so Marghera/Murano centroids tag correctly (lib geojson kept identical)
- Category URLs narrowed to Venice comune; `isRegaloCategoryUrl` replaces hardcoded region check
- `validateBatch` now fails on low geo-resolution rate (`LOW_GEO_RESOLUTION`)
- `SCRAPE_MIN_COUNT_RATIO` / `SCRAPE_MIN_GEO_RESOLUTION_RATE` env-overridable

## Live run

```
Extracted 42 listing(s); selector hit rate: 1.00; geo resolution rate: 1.00; zone rate: 1.00
inserted=39 updated=3 skipped=0 rejected=0
```

`check-visible-listings.mjs`: **PASS** — `visible_subito_in_listings_public=42`

Note: first Venice-scoped run used `SCRAPE_MIN_COUNT_RATIO=0.25` because trailing Veneto-wide medians were ~90 while Venice comune supply is ~42. Geo threshold stayed at 0.5 (observed 1.00).

## Elenco

`/list` renders scraped Subito cards with zone labels (verified via anon `listings_public` + HTML listing links).
