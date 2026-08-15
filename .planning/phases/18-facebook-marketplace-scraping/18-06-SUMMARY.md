---
phase: 18-facebook-marketplace-scraping
plan: 06
subsystem: consumer
tags: [facebook, consumer, feed-search, external-url, CARD-03, I18N-01, D-18-41]
status: complete

requires:
  - phase: 18-facebook-marketplace-scraping
    plan: 02
    provides: facebook persist + translation enqueue
  - phase: 18-facebook-marketplace-scraping
    plan: 04
    provides: category mapping complete
provides:
  - facebook.com external URL allowlist (D-18-35)
  - ScrapedListingShell routing for facebook detail (D-18-45)
  - Facebook source chip + FREE badge on grid cards (D-18-42/43, CARD-03)
  - Feed search + favorites parity tests (D-18-41/46/47)
affects:
  - 18-07 (human UAT consumer checks)

tech-stack:
  added: []
  patterns:
    - "Consumer feed-search is source-agnostic — facebook uses same title/title_en matching as vinted"
    - "ScrapedListingShell external claim via isAllowedExternalUrl host allowlist"
    - "Monochrome Stitch chip #f1f1f0 on ListListingCard for facebook (D-18-43)"

key-files:
  created: []
  modified:
    - lib/listings/external-url.ts
    - lib/listings/external-url.test.ts
    - app/listing/[id]/page.tsx
    - lib/listings/feed-search.test.ts
    - lib/listings/favorites-compat.test.ts

key-decisions:
  - "No FilterSheet source filter — D-18-44 deferred, verified unchanged"
  - "feed-search.ts is canonical search module (plan referenced search.ts)"

requirements-completed: [CARD-03, I18N-01, D-18-41, D-18-42, D-18-43, D-18-44, D-18-45, D-18-46, D-18-47]

metrics:
  duration: 5min
  completed: 2026-08-15
  tasks: 3
  files: 5
---

# Phase 18 Plan 06: Facebook Consumer Parity Summary

**One-liner:** Facebook listings in mixed feed with FREE badge, Stitch source chip, external detail link allowlist, feed search, and source-agnostic favorites — no FilterSheet source filter.

## Accomplishments

- Extended `ALLOWED_HOSTS` with `facebook.com` / `www.facebook.com` and marketplace URL tests (D-18-35).
- Routed `source === 'facebook'` through `ScrapedListingShell` for external claim in new tab (D-18-45).
- Confirmed `ListListingCard` FREE badge + monochrome `#f1f1f0` Facebook chip using `messages.listing.sourceFacebook` (CARD-03, D-18-43, I18N-01).
- Added feed-search tests for facebook title + `title_en` matching (D-18-47).
- Added favorites-compat test confirming source-agnostic `toggleFavoriteId` for facebook UUID (D-18-46).
- Verified `queries.test.ts` mixed feed preserves facebook rows sorted by `posted_at` (D-18-41).
- Confirmed D-18-44: no FilterSheet modifications, no facebook-only feed route.
- Verified D-18-48 translation enqueue in `scraper/src/shared/persist.ts` includes facebook via existing `translateBatch` path (Plan 18-02).

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | eff0a64 | External URL allowlist + ScrapedListingShell routing |
| 2 | 45ac0a5 | Facebook feed search + favorites parity tests |

## Decisions Made

- **D-18-44 confirmed absent** — FilterSheet unchanged; source filter deferred per 18-CONTEXT
- **feed-search.ts over search.ts** — plan artifact names drift; implementation lives in `feed-search.ts`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed with naming alignment (`feed-search.ts` vs plan's `search.ts`).

### TDD Gate Compliance

Task 2 marked `tdd="true"`. RED commit `45ac0a5` added facebook search/favorites tests; tests passed without implementation changes because `matchesFeedSearch` is already source-agnostic. No separate GREEN commit required — behavior pre-existed from Phase 17 patterns.

## Verification

- `npm run test:lib -- lib/listings/external-url.test.ts` — 8/8 pass
- `npm run test:lib -- lib/listings/feed-search.test.ts lib/listings/queries.test.ts lib/listings/favorites-compat.test.ts` — pass
- `npm run test:lib -- lib/listings/` — 442/442 pass
- FilterSheet diff in plan commits: 0 lines changed
- `sourceFacebook` present in en/it/zh messages

## Self-Check: PASSED

- FOUND: lib/listings/external-url.ts
- FOUND: app/listing/[id]/page.tsx
- FOUND: lib/listings/feed-search.test.ts
- FOUND: eff0a64
- FOUND: 45ac0a5
