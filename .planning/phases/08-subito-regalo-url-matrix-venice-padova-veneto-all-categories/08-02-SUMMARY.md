---
phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
plan: 02
subsystem: database
tags: [supabase, migration, listings_public, padova, d-28, schema]

requires:
  - 08-01
provides:
  - Migration 020 city/region columns and D-28 listings_public rewrite
  - ListingRow extended with city, region, category fields
  - Consumer queries aligned — no redundant zone-not-null filter
affects:
  - 08-03 scraper persist (city/region at ingest)
  - 08-05 Elenco category chips and city labels

tech-stack:
  added: []
  patterns:
    - "listings_public as sole visibility gate (zone OR city+coords per D-28)"
    - "ACTIVE_LISTING_COLUMNS includes translation and category columns"

key-files:
  created:
    - supabase/migrations/020_subito_location_category.sql
  modified:
    - lib/listings/types.ts
    - lib/listings/queries.ts
    - lib/listings/client-queries.ts
    - lib/listings/queries.test.ts

key-decisions:
  - "Checkpoint option-a: migration 020 full schema with city/region columns and D-28 view rewrite (D-25, D-26, D-28)"
  - "Remove .not('zone', 'is', null) from app queries — view predicate is sole gate"

requirements-completed: [SCRP-01 (extended)]

duration: 3min
completed: 2026-08-05
status: complete
---

# Phase 8 Plan 02: City/Region Schema + D-28 View Summary

**Migration 020 adds city/region columns and rewrites listings_public for Padova visibility; app queries select new columns without double zone filter**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-05T17:47:00Z
- **Completed:** 2026-08-05T17:50:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- **Decision (D-25/D-26/D-28):** Selected option-a — full migration 020 with city/region columns and listings_public visibility rewrite
- **Migration 020:** `city`/`region` text columns, partial indexes on active city/category, view exposes category + translation columns with D-28 OR predicate
- **App alignment:** `ListingRow` extended; `ACTIVE_LISTING_COLUMNS` includes city, region, category fields; redundant `.not('zone', 'is', null)` removed from server and client query paths

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (decision) | — | option-a selected (no code commit) |
| 2 | 9eb558a | Migration 020 city/region + view rewrite |
| 3 RED | 8d68e04 | Failing tests for D-28 query alignment |
| 3 GREEN | f716966 | Types + queries implementation |

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|------------|
| T-08-02 Information Disclosure | D-28 requires lat/lng for zone-null rows — no city-only leak |
| T-08-03 Tampering | Checkpoint decision recorded; SQL reviewed in migration file |

## Operator Follow-up

Apply migration 020 to Supabase before Plan 03 persist verification:

```bash
supabase db push
# or apply supabase/migrations/020_subito_location_category.sql via SQL editor
```

## Self-Check: PASSED

- FOUND: supabase/migrations/020_subito_location_category.sql
- FOUND: lib/listings/types.ts
- FOUND: lib/listings/queries.ts
- FOUND: lib/listings/client-queries.ts
- FOUND: lib/listings/queries.test.ts
- FOUND: 9eb558a
- FOUND: 8d68e04
- FOUND: f716966
