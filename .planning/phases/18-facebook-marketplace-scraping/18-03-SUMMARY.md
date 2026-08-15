---
phase: 18-facebook-marketplace-scraping
plan: 03
subsystem: scraping
tags: [facebook, playwright, early-stop, enrich, proxy, session, vitest]
status: complete

requires:
  - phase: 18-facebook-marketplace-scraping
    plan: 02
    provides: minimal crawler, session_enc, graphql-extract, worker facebook branch
provides:
  - Full runFacebookCrawler with 6-URL sequential crawl, GraphQL intercept, concurrency 1
  - enrich.ts with isFacebookLocalPickup pickup gate and geo/bbox validation
  - applyEarlyStop K=5 per URL + stable crawl hash for incremental runs
  - runFacebookCrawlWithProxyFallback without direct-IP fallback
  - FACEBOOK_MIN_COUNT_RATIO sparse yield validation (SCRP-E08)
affects:
  - 18-04 (category mapping on enriched listings)
  - 18-07 (human UAT with live session)

tech-stack:
  added: []
  patterns:
    - "Reject shipping-only via delivery_types at enrich layer (D-18-04 option-a)"
    - "Stable crawl hash excludes synthetic posted_at — FB search cards lack listing timestamp"
    - "runFacebookCrawlWithProxyFallback throws on missing proxy; no quota direct fallback"
    - "session_expired fails run + recordDegradedRun + SESSION_EXPIRED operator alert"

key-files:
  created:
    - scraper/src/facebook/enrich.ts
    - scraper/src/facebook/known-set.ts
  modified:
    - scraper/src/facebook/crawler.ts
    - scraper/src/facebook/crawler.test.ts
    - scraper/src/facebook/normalize.ts
    - scraper/src/facebook/filters.test.ts
    - scraper/src/facebook/session.ts
    - scraper/src/facebook/session.test.ts
    - scraper/src/worker.ts
    - scraper/src/worker-proxy-fallback.ts
    - scraper/src/shared/validate-run.ts

key-decisions:
  - "D-18-04 option-a: reject shipping-only via delivery_types / detail fallback (auto-selected)"
  - "Stable crawl_content_hash uses title+price+photo with empty posted_at for FB incremental early-stop"

patterns-established:
  - "cardToEarlyStopListing uses content fields only; enrichFacebookCard assigns scrape posted_at"
  - "Worker facebook branch uses full config.urls matrix via runFacebookCrawlWithProxyFallback"

requirements-completed: [SCRP-E02, SCRP-E03, SCRP-E04, SCRP-E05, SCRP-E06, SCRP-E07, SCRP-E08, D-18-04, D-18-09, D-18-12, D-18-13, D-18-14, D-18-15, D-18-16, D-18-17, D-18-18, D-18-25, D-18-26, D-18-27, D-18-28, D-18-31, D-18-37, D-18-38, D-18-39]

metrics:
  duration: 3min
  completed: 2026-08-15
  tasks: 3
  files: 11
---

# Phase 18 Plan 03: Full Facebook Crawler Summary

**One-liner:** Production Facebook Playwright crawler with pickup gate, incremental early-stop, proxy-only worker path, and sparse-yield batch validation mirroring Subito/Vinted patterns.

## Accomplishments

- Auto-selected **D-18-04 option-a**: `isFacebookLocalPickup` rejects shipping-only `delivery_types` at enrich layer (Vinted D-17-15 parity).
- Expanded `runFacebookCrawler` to full multi-URL fixture/live path with `applyEarlyStop`, `detailBudgetCap`, `external_id` dedup, and stable crawl hash for incremental runs.
- Added `enrich.ts` for pickup/geo validation, `known-set.ts` re-export, bbox check in `normalizeFacebookRawListing`, and `crawl_content_hash` on persist path.
- Hardened worker: `runFacebookCrawlWithProxyFallback` (no direct fallback), `session_expired` fail-fast with degraded run + operator alert, full 6-URL crawl, `FACEBOOK_MIN_COUNT_RATIO_*` for SCRP-E08.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1–2 | 3891194 | Full crawler, enrich, early-stop, pickup gate |
| 3 | 6adb864 | Worker proxy gate, session probe, sparse validation |

## Decisions Made

- **D-18-04 option-a (auto-selected):** Reject shipping-only listings; require IN_PERSON/meet-up signal in `delivery_types`.
- **Stable crawl hash:** Facebook search cards lack listing `posted_at`; hash uses title+price+photo with empty `posted_at` so incremental early-stop matches DB `crawl_content_hash`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Stable crawl hash for incremental early-stop**
- **Found during:** Task 2
- **Issue:** Using scrape-run timestamp in early-stop hash prevented known-map matches across runs.
- **Fix:** Empty `posted_at` in early-stop listings; `crawl_content_hash` computed with same stable fields in normalize.
- **Files modified:** `crawler.ts`, `normalize.ts`
- **Commit:** 3891194

None otherwise — plan executed as written.

## Verification

- `npx vitest run src/facebook/filters.test.ts src/facebook/session.test.ts src/facebook/crawler.test.ts src/subito/early-stop.test.ts` — 22/22 pass
- `grep maxConcurrency: 1` / `applyEarlyStop` in crawler.ts — pass
- `grep session_expired` in session.ts — pass
- `grep 'Facebook crawl requires'` in worker.ts — pass

## Known Stubs

| File | Reason | Future plan |
|------|--------|-------------|
| Live `probeFacebookSession` / Playwright crawl | Requires operator FB session + residential proxy at runtime | 18-07 human UAT |
| Detail Playwright fetch | Fixture-tested; live detail GraphQL parse unverified without credentials | 18-07 |

## Self-Check: PASSED

- FOUND: scraper/src/facebook/enrich.ts
- FOUND: scraper/src/facebook/known-set.ts
- FOUND: scraper/src/facebook/crawler.ts
- FOUND: commit 3891194
- FOUND: commit 6adb864

## Next Phase Readiness

- Plan 18-04 can wire `FACEBOOK_CATEGORY_TO_SLUG` into enriched listings with category_id from cards/detail.
- Operator session + proxy UAT remains for 18-07.
