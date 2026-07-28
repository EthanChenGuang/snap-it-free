---
phase: 01-scraper-foundation-listing-data-model
plan: 03
subsystem: scraper
tags: [normalize, zone-tag, turf, free-filter, scrape-rejects, geojson, vitest]

# Dependency graph
requires:
  - phase: 01-02
    provides: extract.ts detail-page flow, persistListing, worker tracer
provides:
  - normalizeRawListing pipeline (free filter + zone tag + Zod gate)
  - logReject audit trail to scrape_rejects
  - Static Venice zone GeoJSON polygons and Turf point-in-polygon tagging
  - Municipality centroid fallback in extract resolveCoords (D-16)
  - Worker multi-listing crawl with reject/persist counters
affects:
  - 01-04 (batch validation, scrape_run tracking, operator alerts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "normalizeRawListing: isMislabeledFree → tagZone → contentHash → Zod parse"
    - "GeoJSON loaded via fs.readFileSync for vitest compatibility"
    - "Worker rejects → logReject; accepts → persistListing only"

key-files:
  created:
    - scraper/src/shared/normalize.ts
    - scraper/src/geo/centro-storico.geojson
    - scraper/src/geo/mestre-marghera.geojson
    - scraper/src/geo/lido-murano.geojson
    - scraper/src/geo/municipality-centroids.json
  modified:
    - scraper/src/shared/normalize.test.ts
    - scraper/src/shared/zone-tag.ts
    - scraper/src/shared/zone-tag.test.ts
    - scraper/src/shared/persist.ts
    - scraper/src/subito/extract.ts
    - scraper/src/worker.ts

key-decisions:
  - "GeoJSON loaded via readFileSync instead of import assertions — vitest/Vite cannot parse .geojson imports"
  - "Municipality centroid fallback runs in extract.ts resolveCoords before normalize (D-16)"
  - "scrape_run_id null placeholder until Plan 04 run tracking"
  - "Multi-card extraction on first category page to exercise filter and zone tag"

patterns-established:
  - "Rejects auditable via logReject → scrape_rejects with raw_snippet"
  - "zone=null when coords missing or outside polygons (D-15)"
  - "expires_at = posted_at + 48h at normalization (D-12)"

requirements-completed: [SCRP-02, SCRP-03, SCRP-05]

coverage:
  - id: D1
    description: "D-17 Italian free-listing filter rejects price/negotiation language in title and description"
    requirement: SCRP-05
    verification:
      - kind: unit
        ref: "scraper/src/shared/normalize.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-14/D-15 Turf zone tagging at ingestion with null when outside polygons"
    requirement: SCRP-03
    verification:
      - kind: unit
        ref: "scraper/src/shared/zone-tag.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Worker uses normalizeRawListing exclusively with scrape_rejects audit"
    requirement: SCRP-05
    verification:
      - kind: unit
        ref: "scraper/src/shared/normalize.test.ts src/shared/dedupe.test.ts"
        status: pass
    human_judgment: true
    rationale: "Live worker persist still blocked on missing Supabase credentials (inherited from Plan 02)"

# Metrics
duration: 8min
completed: 2026-07-28
status: complete
---

# Phase 01 Plan 03: Free Filter, Zone Tagging & Normalize Pipeline Summary

**Italian free-listing filter, Turf zone tagging, and normalizeRawListing wired into worker with scrape_rejects audit trail**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-28T07:20:00Z
- **Completed:** 2026-07-28T07:28:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- `normalizeRawListing` gates on `isMislabeledFree`, assigns zone via Turf, computes `expires_at` +48h, and Zod-parses canonical listings
- `logReject` inserts audit rows into `scrape_rejects` with title/description snippet
- Three static GeoJSON zone polygons plus municipality centroid lookup for D-16 coord fallback
- Worker processes all category cards on page 1; tracks inserted/updated/skipped/rejected counts

## Task Commits

Each task was committed atomically:

1. **Task 1: Italian free-listing filter and scrape_rejects** - `d77a5a5` (feat)
2. **Task 2: Venice zone polygons and Turf tagging** - `ec326b5` (feat)
3. **Task 3: Wire normalize pipeline into worker** - `723e0b5` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `scraper/src/shared/normalize.ts` - Free filter + zone tag + Zod pipeline
- `scraper/src/shared/persist.ts` - Added `logReject` for scrape_rejects audit
- `scraper/src/shared/zone-tag.ts` - `loadZonePolygons` + `tagZone` with Turf
- `scraper/src/geo/*.geojson` - Static Venice zone boundaries
- `scraper/src/geo/municipality-centroids.json` - D-16 centroid lookup table
- `scraper/src/subito/extract.ts` - `resolveCoords` centroid fallback; multi-card extraction
- `scraper/src/worker.ts` - normalizeRawListing + logReject/persistListing flow

## Decisions Made

- GeoJSON loaded via `readFileSync` — Vite/vitest cannot parse JSON import assertions on `.geojson` files
- Centroid fallback in extract.ts (not normalize.ts) per D-16
- `scrape_run_id: null` until Plan 04 implements run tracking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] GeoJSON import assertions fail under vitest**

- **Found during:** Task 2 (zone-tag.test.ts)
- **Issue:** `import geojson with { type: 'json' }` causes Rollup parse failure in vitest
- **Fix:** Load GeoJSON via `readFileSync` from `scraper/src/geo/` at module init
- **Files modified:** `scraper/src/shared/zone-tag.ts`, `scraper/src/subito/extract.ts`
- **Commit:** ec326b5

None otherwise — plan executed as written.

## Issues Encountered

- **Supabase credentials still missing:** Live worker persist/reject logging blocked until operator sets env (inherited from Plan 02). Unit tests pass; crawl+normalize logic verified offline.

## Next Phase Readiness

- Normalize pipeline ready for Plan 04 batch validation gate and scrape_run tracking
- Zone boundaries are approximate hand-drawn polygons — manual QA recommended before production filter reliance
- Multi-card crawl on page 1 may be slow (~32 detail navigations); tune concurrency in Plan 04 if needed

---
*Phase: 01-scraper-foundation-listing-data-model*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: scraper/src/shared/normalize.ts
- FOUND: scraper/src/shared/zone-tag.ts
- FOUND: scraper/src/geo/centro-storico.geojson
- FOUND: scraper/src/worker.ts
- FOUND: d77a5a5
- FOUND: ec326b5
- FOUND: 723e0b5
