---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
plan: 02
subsystem: scraper
tags: [vinted, listing_source, http-extract, filters, crawler, tracer]
requires:
  - phase: 17
    plan: 01
    provides: Wave 0 catalog API field map, fixtures, session-warm cookie pattern
provides:
  - listing_source enum extended with vinted (DB migration + scraper/lib TS enums)
  - Fixture-driven parseCatalogApiResponse and €0-only isFreePrice gate
  - Minimal runVintedCrawler + worker vinted branch → persist → translation enqueue path
  - Mixed feed query test proving source=vinted rows are not excluded (D-17-25)
affects:
  - 17-03 (enrichment, geo, incremental early-stop)
  - 17-05 (admin flip vinted to live)

tech-stack:
  added: []
  patterns:
    - Session-warm catalog page GET then cookie-authenticated /api/v2/catalog/items fetch
    - Generic runCrawlWithProxyFallback for Subito and Vinted crawlers
    - persistBatch routes source=vinted through normalizeVintedRawListing + translateBatch

key-files:
  created:
    - supabase/migrations/028_listing_source_vinted.sql
    - scraper/src/vinted/catalog-api.ts
    - scraper/src/vinted/http-extract.ts
    - scraper/src/vinted/filters.ts
    - scraper/src/vinted/normalize.ts
    - scraper/src/vinted/crawler.ts
  modified:
    - scraper/src/shared/schema.ts
    - lib/listings/types.ts
    - lib/listings/schema.ts
    - scraper/src/worker.ts
    - scraper/src/shared/persist.ts
    - scraper/src/worker-proxy-fallback.ts
    - lib/listings/queries.test.ts

key-decisions:
  - "D-17-23 option-a: ALTER TYPE listing_source ADD VALUE vinted — locked in 17-CONTEXT.md"
  - "D-17-01 option-a: strict €0 price.amount gate only — no gratis/regalo title fallback"
  - "Migration ships as 028 (024 already taken by scrape_runs_operator_rls)"

patterns-established:
  - "Vinted persist: normalizeVintedRawListing validates vinted.it host (T-17-04) before CanonicalListingSchema bbox superRefine"
  - "Worker routes sourceSlug=vinted through runCrawlWithProxyFallback(runVintedCrawler)"

requirements-completed: [SCRP-E01, SCRP-E08, D-17-23, D-17-01, D-17-02, D-17-04, D-17-07, D-17-11, D-17-22, D-17-25]

coverage:
  - id: D1
    description: "listing_source enum includes vinted in DB migration + scraper zod + lib/listings types"
    requirement: D-17-23
    verification:
      - kind: unit
        ref: "grep vinted scraper/src/shared/schema.ts lib/listings/types.ts && test -f supabase/migrations/028_listing_source_vinted.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseCatalogApiResponse returns RawListing[] from fixture without Playwright"
    requirement: SCRP-E01
    verification:
      - kind: unit
        ref: "scraper/src/vinted/http-extract.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "isFreePrice rejects null/empty/non-zero; rejectReasonIfNotFree returns not_free"
    requirement: D-17-01
    verification:
      - kind: unit
        ref: "scraper/src/vinted/filters.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "normalizeVintedRawListing produces CanonicalListing row shape for €0 Venice coords"
    requirement: D-17-11
    verification:
      - kind: unit
        ref: "scraper/src/vinted/normalize.test.ts#accepts a €0 Vinted listing"
        status: pass
    human_judgment: false
  - id: D5
    description: "worker.ts routes sourceSlug=vinted without throw; persist enqueues translation"
    requirement: D-17-22
    verification:
      - kind: unit
        ref: "grep sourceSlug === 'vinted' scraper/src/worker.ts && persist.ts normalizeVintedRawListing + translateBatch"
        status: pass
    human_judgment: true
    rationale: "Live crawl→DB persist E2E requires migration applied + outbound vinted.it; tracer proven via unit tests and code wiring"
  - id: D6
    description: "Default feed query does not exclude source=vinted (mixed chronological feed)"
    requirement: D-17-25
    verification:
      - kind: unit
        ref: "lib/listings/queries.test.ts#returns a mixed feed that preserves vinted-source rows"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-15
status: complete
---

# Phase 17 Plan 02: Vinted Tracer Summary

**listing_source vinted enum + fixture-driven catalog extract, €0 price gate, minimal crawler wired through worker→persist with mixed-feed query proof**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-15T14:05:00Z
- **Completed:** 2026-08-15T14:17:00Z
- **Tasks:** 3 (2 decision checkpoints + 1 tracer)
- **Files modified:** 17

## Accomplishments

- Extended `listing_source` with `vinted` in migration 028 and all three TS enum locations (D-17-23)
- Implemented `parseCatalogApiResponse`, `isFreePrice` / `rejectReasonIfNotFree`, and `normalizeVintedRawListing` with vinted.it host validation and bbox superRefine (D-17-01/02/04/11, T-17-04)
- Added minimal `runVintedCrawler` (session-warm + catalog API) and worker `vinted` branch via generic `runCrawlWithProxyFallback`
- Persist router sends `source=vinted` listings through normalize + existing `translateBatch` enqueue (D-17-22)
- Feed query test documents mixed feed includes vinted rows sorted by `posted_at` (D-17-25)

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Confirm ListingSource vinted enum extension (D-17-23)** — decision recorded (option-a); no code commit
2. **Task 2: Confirm €0-only free item definition (D-17-01)** — decision recorded (option-a); no code commit
3. **Task 3: Migration + fixture extract/filters + minimal crawler→persist tracer** — `92cc875` (feat)

**Plan metadata:** `8a11953` (docs: complete plan)

## Files Created/Modified

- `supabase/migrations/028_listing_source_vinted.sql` — `ALTER TYPE listing_source ADD VALUE IF NOT EXISTS 'vinted'`
- `scraper/src/vinted/catalog-api.ts` — catalog URL → API query params
- `scraper/src/vinted/http-extract.ts` — fixture-driven catalog JSON parse (SCRP-E01)
- `scraper/src/vinted/filters.ts` — strict €0 price gate
- `scraper/src/vinted/normalize.ts` — canonical row builder + host/bbox gates
- `scraper/src/vinted/crawler.ts` — minimal session-warm HttpCrawler path
- `scraper/src/worker.ts` — `sourceSlug === 'vinted'` branch
- `scraper/src/worker-proxy-fallback.ts` — generalized `runCrawlWithProxyFallback`
- `scraper/src/shared/persist.ts` — vinted normalize router + richer reject logging
- `lib/listings/queries.test.ts` — mixed feed vinted row test (D-17-25)

## Decisions Made

- **D-17-23 option-a:** `ALTER TYPE listing_source ADD VALUE vinted` — aligns admin SOURCE_SLUGS, scraper, and lib types
- **D-17-01 option-a:** Only `price.amount === 0` qualifies as free — no keyword fallback
- **Migration numbering:** Ships as `028_listing_source_vinted.sql` because `024` is already taken

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration renumbered 024 → 028**
- **Found during:** Task 3
- **Issue:** Plan referenced `024_listing_source_vinted.sql` but `024_scrape_runs_operator_rls.sql` already exists
- **Fix:** Created `028_listing_source_vinted.sql` with same `ALTER TYPE` statement
- **Files modified:** `supabase/migrations/028_listing_source_vinted.sql`
- **Committed in:** `92cc875`

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Numbering only; semantics unchanged.

## Issues Encountered

- Full `npm run test:lib` suite has 1 pre-existing failure in `lib/admin/url-validate.test.ts` (Italian cities quick task); plan-scoped verification (`queries.test.ts`, vinted vitest) passes

## User Setup Required

- **Supabase:** Apply migration 028 before live persist accepts `source=vinted` rows (`alter type listing_source add value if not exists 'vinted'`). Use Supavisor pooler if direct IPv6 unreachable (Phase 14/15 pattern).

## Next Phase Readiness

- Plan 17-03 can add enrichment (RSC catalog_id/shipping), geo resolution, incremental early-stop
- Plan 17-05 can flip admin vinted source to live after matrix URLs seeded
- Tracer architecture proven; live E2E persist pending migration apply + €0 supply on catalog pages

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: `.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-02-SUMMARY.md`
- FOUND: commit `92cc875`
