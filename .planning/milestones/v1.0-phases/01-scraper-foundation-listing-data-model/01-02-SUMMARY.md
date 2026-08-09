---
phase: 01-scraper-foundation-listing-data-model
plan: 02
subsystem: scraper
tags: [crawlee, playwright, subito, supabase, zod, vitest, dedupe]

# Dependency graph
requires:
  - phase: 01-01
    provides: CanonicalListingSchema, dedupe hash, category URLs, Supabase migrations
provides:
  - Live Subito DOM spike documentation (D-23 SPIKE-NOTES.md)
  - PlaywrightCrawler fetch layer separated from extract.ts (D-03, D-05)
  - End-to-end tracer: category URL → extract → Zod → persistListing
  - persist.test.ts and expanded dedupe.test.ts for SCRP-02
affects:
  - 01-03 (normalize pipeline, free filter, zone tag)
  - 01-04 (proxy rotation, batch validation, audit tables)

# Tech tracking
tech-stack:
  added: [playwright]
  patterns:
    - "Category page → detail page navigation inside extract.ts (not crawler)"
    - "persistListing returns skipped|inserted|updated with geom WKT upsert"
    - "Italian relative posted_at parsing (Oggi/Ieri alle HH:MM)"

key-files:
  created:
    - scraper/src/subito/SPIKE-NOTES.md
    - scraper/src/subito/crawler.ts
    - scraper/src/subito/extract.ts
    - scraper/src/config.ts
    - scraper/src/shared/persist.ts
    - scraper/src/shared/persist.test.ts
    - scraper/src/worker.ts
    - scraper/scripts/spike-subito*.mjs
  modified:
    - scraper/src/shared/dedupe.test.ts
    - scraper/package.json

key-decisions:
  - "Detail-page extraction for tracer — category cards lack reliable posted_at and may show placeholder photos"
  - "Null lat/lng accepted when map embed absent on sampled listing (D-16 fallback)"
  - "ProxyConfiguration stub commented in crawler.ts — deferred to Plan 04"

patterns-established:
  - "extractListingsFromPage: pure DOM, zero Crawlee/Supabase imports"
  - "crawler.ts: PlaywrightCrawler session pool only, calls extract"
  - "worker.ts tracer scope: first SUBITO_CATEGORY_URLS entry, one listing, zone null"

requirements-completed: [SCRP-01, SCRP-02]

coverage:
  - id: D1
    description: "Live Subito spike documents selectors and pagination before extract lock (D-23)"
    requirement: SCRP-01
    verification:
      - kind: unit
        ref: "scraper/src/subito/categories.test.ts"
        status: pass
    human_judgment: true
    rationale: "Spike scripts hit live Subito pages; automated test only validates URL constants"
  - id: D2
    description: "Crawllee fetch/extract separation with session pool (D-03, D-05)"
    requirement: SCRP-01
    verification:
      - kind: integration
        ref: "node --import tsx runSubitoCrawler([SUBITO_CATEGORY_URLS[0]])"
        status: pass
    human_judgment: false
  - id: D3
    description: "persistListing dedupe skip and geom WKT upsert (D-10, SCRP-02)"
    requirement: SCRP-02
    verification:
      - kind: unit
        ref: "scraper/src/shared/persist.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full worker tracer persists ≥1 listing to Supabase"
    requirement: SCRP-01
    verification:
      - kind: integration
        ref: "node --import tsx src/worker.ts"
        status: fail
    human_judgment: true
    rationale: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not configured — operator must apply migrations and set env"

# Metrics
duration: 12min
completed: 2026-07-28
status: complete
---

# Phase 01 Plan 02: Subito Spike & End-to-End Tracer Summary

**Live Subito DOM spike with Crawlee→extract→Zod→Supabase persist stack; crawl verified, Supabase persist blocked on missing credentials**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-28T07:10:00Z
- **Completed:** 2026-07-28T07:22:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Live spike documented card/detail selectors, button pagination (no `?o=`), anti-bot signals in SPIKE-NOTES.md
- PlaywrightCrawler with session pool fetches first regalo category URL; extract navigates to detail page
- persistListing implements content_hash skip, geom WKT upsert, onConflict `(source, external_id)`
- persist.test.ts (4 tests) and dedupe.test.ts (5 tests) pass; crawl extracts real listing with description

## Task Commits

Each task was committed atomically:

1. **Task 1: Live Subito DOM spike (D-23)** - `5e7fab2` (feat)
2. **Task 2: End-to-end one Subito listing → Supabase** - `576166c` (feat)
3. **Task 3: Harden persist layer and dedup integration (SCRP-02)** - `7c78f3f` (test)

**Plan metadata:** pending (docs commit)

## Files Created/Modified
- `scraper/src/subito/SPIKE-NOTES.md` - Live DOM selector and pagination documentation
- `scraper/src/subito/extract.ts` - extractListingsFromPage with detail-page field extraction
- `scraper/src/subito/crawler.ts` - PlaywrightCrawler, session pool, no DOM parsing
- `scraper/src/config.ts` - Supabase service-role client, scrape thresholds
- `scraper/src/shared/persist.ts` - persistListing with dedupe skip and geom WKT
- `scraper/src/shared/persist.test.ts` - Mock Supabase skip/upsert tests
- `scraper/src/worker.ts` - Tracer entrypoint: one URL, Zod gate, persist
- `scraper/scripts/spike-subito*.mjs` - Ad-hoc Playwright spike scripts

## Decisions Made
- Navigate category → detail inside extract.ts for reliable photo, posted_at, description
- Accept null coords when map embed absent (sampled Venezia listing had municipality text only)
- Proxy stub commented in crawler — tracer runs direct without proxy per plan scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed description extraction picking dialog boilerplate**
- **Found during:** Task 2 (tracer crawl verification)
- **Issue:** First `p` tag matched "Beginning of dialog window…" instead of listing description
- **Fix:** Prefer paragraph under "Descrizione" heading; filter dialog/ad boilerplate
- **Files modified:** scraper/src/subito/extract.ts
- **Commit:** 576166c

**2. [Rule 3 - Blocking] Added playwright as explicit dependency**
- **Found during:** Task 1 (live spike scripts)
- **Issue:** crawlee peer dependency playwright not installed; spike scripts failed
- **Fix:** `npm install playwright` added to package.json
- **Files modified:** scraper/package.json, scraper/package-lock.json
- **Commit:** 576166c

## Issues Encountered
- **Supabase credentials missing:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` not set in environment. Worker fails at config load. Crawl+extract verified independently (1 listing, hit rate 1.0). Operator must configure env and apply migrations before live persist.

## User Setup Required

Supabase configuration required for full tracer persist:
- Create Supabase Pro project; enable PostGIS extension
- Apply migrations in `supabase/migrations/`
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `scraper/.env`
- Verify: `cd scraper && node --import tsx src/worker.ts` → expect `inserted:` log; second run → `skipped:`

## Next Phase Readiness
- Fetch/extract/persist stack ready for Plan 03 normalize integration (free filter, zone tag)
- Blocker: Supabase env + migrations required before production tracer persist
- SPIKE-NOTES selectors locked for current Subito DOM (2026-07-28)

---
*Phase: 01-scraper-foundation-listing-data-model*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: scraper/src/subito/SPIKE-NOTES.md
- FOUND: scraper/src/subito/extract.ts
- FOUND: scraper/src/shared/persist.ts
- FOUND: scraper/src/worker.ts
- FOUND: 5e7fab2
- FOUND: 576166c
- FOUND: 7c78f3f
