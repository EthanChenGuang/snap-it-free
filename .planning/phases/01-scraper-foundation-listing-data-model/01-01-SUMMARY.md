---
phase: 01-scraper-foundation-listing-data-model
plan: 01
subsystem: database
tags: [supabase, postgis, vitest, zod, crawlee, scraper]

# Dependency graph
requires: []
provides:
  - PostGIS-enabled Supabase migrations for listings and scrape audit tables
  - CanonicalListingSchema (Zod) mirroring DB enums per D-13
  - Wave 0 Vitest harness with 14 unit tests across 6 files
  - D-22 legal/ops note for Subito robots.txt and fallback supply plan
  - ESM TypeScript scraper package scaffold with approved npm deps
affects:
  - 01-02 (Subito spike + end-to-end tracer)
  - 01-03 (normalize pipeline integration)
  - Phase 2 (map queries on PostGIS geom)

# Tech tracking
tech-stack:
  added: [vitest, zod, @supabase/supabase-js, crawlee, @turf/boolean-point-in-polygon, tsx]
  patterns:
    - "Zod CanonicalListingSchema gate before any DB-bound shape (D-13)"
    - "SQL migrations as source of truth; TypeScript enums mirror migration enums"
    - "Wave 0 unit tests as Nyquist automated verify gates"

key-files:
  created:
    - supabase/migrations/001_enable_postgis.sql
    - supabase/migrations/002_listings_schema.sql
    - supabase/migrations/003_scrape_audit_tables.sql
    - scraper/src/shared/schema.ts
    - scraper/src/shared/dedupe.ts
    - scraper/src/shared/free-filter.ts
    - scraper/src/shared/validate-run.ts
    - scraper/src/shared/zone-tag.ts
    - scraper/src/subito/categories.ts
    - docs/legal/subito-scraping-note.md
    - scraper/vitest.config.ts
  modified:
    - .gitignore

key-decisions:
  - "D-06/D-08/D-09 locked — Supabase Pro + PostGIS geography column, single listings table (option-a)"
  - "npm package legitimacy verified for crawlee, playwright, @supabase/supabase-js, zod, @turf/boolean-point-in-polygon, vitest"

patterns-established:
  - "CanonicalListingSchema.parse() as ingestion gate before Supabase writes"
  - "content_hash SHA-256 dedupe key from normalized listing fields"
  - "isMislabeledFree helper stub for price-language rejection (full normalize in Plan 03)"

requirements-completed: [SCRP-02, SCRP-03, SCRP-05, SCRP-06]

coverage:
  - id: D1
    description: "PostGIS extension and listings table with source enum and GiST index"
    requirement: SCRP-02
    verification:
      - kind: unit
        ref: "scraper/src/shared/schema.test.ts"
        status: pass
    human_judgment: true
    rationale: "Migrations committed but Supabase apply requires operator dashboard action"
  - id: D2
    description: "Zone tagging at ingestion via point-in-polygon (centro_storico fixture)"
    requirement: SCRP-03
    verification:
      - kind: unit
        ref: "scraper/src/shared/zone-tag.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Price/negotiation language filtered via isMislabeledFree helper"
    requirement: SCRP-05
    verification:
      - kind: unit
        ref: "scraper/src/shared/normalize.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Batch validation gate — count/selector thresholds reject bad runs"
    requirement: SCRP-06
    verification:
      - kind: unit
        ref: "scraper/src/shared/validate-run.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Content hash dedupe — identical fields produce identical SHA-256"
    requirement: SCRP-02
    verification:
      - kind: unit
        ref: "scraper/src/shared/dedupe.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Subito category URLs match Veneto regalo pattern without sort params"
    verification:
      - kind: unit
        ref: "scraper/src/subito/categories.test.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "D-22 legal note documents robots.txt prohibition and fallback supply plan"
    verification: []
    human_judgment: true
    rationale: "Legal posture requires operator acknowledgment before production crawl"

# Metrics
duration: 45min
completed: 2026-07-28
status: complete
---

# Phase 01 Plan 01: Supabase Schema & Wave 0 Tests Summary

**PostGIS listing store migrations, Zod CanonicalListingSchema, and 14-test Vitest Wave 0 harness with D-22 legal note**

## Performance

- **Duration:** ~45 min (across sessions; close-out resume)
- **Started:** 2026-07-27T15:27:00Z
- **Completed:** 2026-07-28T07:15:00Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments
- Locked Supabase Pro + PostGIS as listing store (D-06, D-08, D-09)
- Created three SQL migrations: PostGIS extension, listings table with enums/GiST indexes, scrape audit tables
- Scaffolded `scraper/` ESM TypeScript package with Vitest and approved npm dependencies
- Implemented CanonicalListingSchema matching DB field names and enum values
- Wave 0 test suite: 6 files, 14 tests — all passing
- Documented Subito robots.txt risk and fallback supply plan (D-22)

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm Supabase + PostGIS (option-a)** - `6dc8351` (docs)
2. **Task 2: npm package verify checkpoint** - user approved (no commit; checkpoint gate)
3. **Task 3: Supabase migrations, scraper scaffold, Wave 0 tests, legal note** - `03c4b3d` (feat)

**Plan metadata:** pending (docs close-out commit)

## Files Created/Modified
- `supabase/migrations/001_enable_postgis.sql` - Enables PostGIS extension
- `supabase/migrations/002_listings_schema.sql` - Listings table with source/status/zone enums, GiST geom index
- `supabase/migrations/003_scrape_audit_tables.sql` - scrape_runs and scrape_rejects audit tables
- `scraper/src/shared/schema.ts` - CanonicalListingSchema + ListingSource/VeniceZone enums
- `scraper/src/shared/dedupe.ts` - SHA-256 content hash for dedupe
- `scraper/src/shared/free-filter.ts` - isMislabeledFree price-language filter stub
- `scraper/src/shared/validate-run.ts` - Batch count/selector validation gate
- `scraper/src/shared/zone-tag.ts` - Point-in-polygon zone assignment
- `scraper/src/subito/categories.ts` - SUBITO_CATEGORY_URLS constants
- `docs/legal/subito-scraping-note.md` - D-22 legal/ops posture and fallback plan
- `scraper/vitest.config.ts` - Vitest runner for Wave 0 gates

## Decisions Made
- Supabase Pro + PostGIS selected over self-hosted Postgres (option-a) — anchors Phase 2 map bbox queries
- npm packages verified legitimate before install (crawlee, playwright, supabase-js, zod, turf, vitest)
- isMislabeledFree extracted to minimal module; full normalize pipeline deferred to Plan 03

## Deviations from Plan

None - plan executed exactly as written. Task 3 implementation existed on disk from prior session; close-out resume verified tests and committed without reimplementation.

## Issues Encountered
- Workspace disconnected before Task 3 commit in prior session — resolved by close-out resume with test verification before atomic commit

## User Setup Required

Supabase project configuration required before migrations take effect:
- Create Supabase Pro project and enable PostGIS extension in Dashboard → Database → Extensions
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` (worker-only)
- Apply migrations via Supabase SQL editor or `supabase db push`

## Next Phase Readiness
- Wave 1 complete — ready for 01-02 Subito spike + end-to-end tracer
- Blockers: Supabase migrations must be applied by operator; Subito DOM selectors unverified until Plan 02 spike

---
*Phase: 01-scraper-foundation-listing-data-model*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: supabase/migrations/002_listings_schema.sql
- FOUND: scraper/vitest.config.ts
- FOUND: docs/legal/subito-scraping-note.md
- FOUND: 6dc8351
- FOUND: 03c4b3d
