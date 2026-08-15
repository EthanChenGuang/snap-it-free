---
phase: 18-facebook-marketplace-scraping
plan: 02
subsystem: scraping
tags: [facebook, playwright, graphql, session_enc, crawler, i18n, vitest]

requires:
  - phase: 18-facebook-marketplace-scraping
    plan: 01
    provides: graphql-extract, filters, session probe modules + fixtures
provides:
  - Migration 030 session_enc + 6-URL facebook seed matrix
  - encryptSession/decryptSession with AES-256-GCM roundtrip tests
  - Minimal runFacebookCrawler with fixture mode + worker facebook branch
  - normalizeFacebookRawListing + persist router + translation enqueue path
  - ListListingCard sourceFacebook chip + en/it/zh i18n
affects:
  - 18-03 (full 6-URL crawl + early-stop)
  - 18-04 (facebook category mapping)
  - 18-05 (admin session upload UI)

tech-stack:
  added: []
  patterns:
    - "session_enc encrypted JSONB mirroring proxy_enc (D-18-11 option-a)"
    - "Price-field-only free gate — no title gratis fallback (D-18-01 option-a)"
    - "Fixture-driven crawler.test.ts for tracer E2E without live FB credentials"
    - "Worker facebook branch: proxy required, no direct fallback (D-18-08)"

key-files:
  created:
    - supabase/migrations/030_facebook_session_enc.sql
    - scraper/src/facebook/crawler.ts
    - scraper/src/facebook/crawler.test.ts
    - scraper/src/facebook/normalize.ts
    - scraper/src/facebook/normalize.test.ts
  modified:
    - lib/admin/crypto.ts
    - lib/admin/crypto.test.ts
    - scraper/src/facebook/session.ts
    - scraper/src/facebook/session.test.ts
    - scraper/src/facebook/graphql-extract.ts
    - scraper/src/worker.ts
    - scraper/src/shared/persist.ts
    - scraper/src/subito/extract.ts
    - components/listings/ListListingCard.tsx
    - lib/listings/queries.test.ts
    - messages/en.ts
    - messages/it.ts
    - messages/zh.ts

key-decisions:
  - "D-18-11 option-a: session_enc jsonb + encryptSession/decryptSession wrappers (auto-selected)"
  - "D-18-40 option-a: new facebook/ module + worker branch beside subito/vinted (auto-selected)"
  - "D-18-01 option-a: price field only — structured zero + localized Free/Gratis (auto-selected)"
  - "Migration numbered 030 (029 already vinted_source_live_seed) — same SQL intent as plan 029"

patterns-established:
  - "runFacebookCrawler fixtureGraphqlBodies bypasses Playwright for CI tracer path"
  - "probeFacebookSessionOrThrow gates worker before crawl; never logs cookie values"

requirements-completed: [SCRP-E01, SCRP-E08, D-18-01, D-18-02, D-18-03, D-18-11, D-18-23, D-18-32, D-18-35, D-18-36, D-18-40, D-18-41, D-18-42, D-18-43, D-18-48, I18N-01]

coverage:
  - id: D1
    description: "session_enc encrypt/decrypt roundtrip with c_user cookie fixture"
    requirement: D-18-11
    verification:
      - kind: unit
        ref: "lib/admin/crypto.test.ts#roundtrips operator cookie JSON"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseGraphqlSearchResponse returns listings from fixture without live network"
    requirement: SCRP-E01
    verification:
      - kind: unit
        ref: "scraper/src/facebook/graphql-extract.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Price-field-only free gate rejects missing/ambiguous price"
    requirement: D-18-01
    verification:
      - kind: unit
        ref: "scraper/src/facebook/filters.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Fixture crawler → normalize tracer path yields source=facebook listing"
    requirement: D-18-40
    verification:
      - kind: integration
        ref: "scraper/src/facebook/crawler.test.ts#returns ≥1 free listing"
        status: pass
    human_judgment: false
  - id: D5
    description: "Mixed feed query includes facebook rows sorted by posted_at"
    requirement: D-18-41
    verification:
      - kind: unit
        ref: "lib/listings/queries.test.ts#preserves facebook-source rows"
        status: pass
    human_judgment: false
  - id: D6
    description: "Grid card FREE badge + Facebook source chip for source=facebook"
    requirement: D-18-42
    verification:
      - kind: unit
        ref: "grep sourceFacebook messages/en.ts messages/it.ts messages/zh.ts"
        status: pass
    human_judgment: true
    rationale: "Visual chip placement/styling requires human UI check against Stitch tokens"
  - id: D7
    description: "Live Venice URL crawl with operator session + proxy"
    requirement: SCRP-E01
    verification: []
    human_judgment: true
    rationale: "FB_SESSION_JSON/PROXY_URL unavailable in executor environment — fixture mock proves architecture"

duration: 45min
completed: 2026-08-15
status: complete
---

# Phase 18 Plan 02: Facebook Tracer Summary

**session_enc migration + fixture-driven GraphQL extract/filters/session + minimal crawler wired through worker with FREE badge and Facebook chip on mixed feed**

## Performance

- **Duration:** 45 min
- **Started:** 2026-08-15T16:31:00Z
- **Completed:** 2026-08-15T17:16:00Z
- **Tasks:** 4 (3 auto-approved decisions + 1 tracer)
- **Files modified:** 18

## Accomplishments

- Added `session_enc` column migration with 6-URL Venice+Padova facebook seed matrix and `encryptSession`/`decryptSession` crypto wrappers
- Implemented minimal `runFacebookCrawler` with GraphQL intercept, price-field free gate, fixture mode for CI, and worker facebook branch (one URL tracer)
- Wired `normalizeFacebookRawListing` through persist router (translation enqueue preserved) and consumer `sourceFacebook` chip + i18n

## Task Commits

1. **Task 1–3: Decision checkpoints (option-a auto-selected)** — logged in commit message
2. **Task 4: Migration + extract/filters/session + crawler tracer** - `437d999` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `supabase/migrations/030_facebook_session_enc.sql` — session_enc + 6-URL seed update
- `lib/admin/crypto.ts` — encryptSession/decryptSession
- `scraper/src/facebook/crawler.ts` — Playwright GraphQL intercept + fixture mode
- `scraper/src/facebook/normalize.ts` — facebook persist normalization
- `scraper/src/facebook/session.ts` — loadFacebookSession, applySessionToContext, probeFacebookSession
- `scraper/src/worker.ts` — facebook branch with proxy + session gates
- `components/listings/ListListingCard.tsx` — sourceFacebook chip

## Decisions Made

- Auto-selected option-a at all three blocking decision checkpoints per user autonomous approval
- Used migration `030` because `029_vinted_source_live_seed.sql` already occupied sequence number 029

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration sequence 030 instead of 029**
- **Found during:** Task 4 (migration creation)
- **Issue:** `029_vinted_source_live_seed.sql` already exists from Phase 17
- **Fix:** Created `030_facebook_session_enc.sql` with identical intended schema/seed content
- **Files modified:** `supabase/migrations/030_facebook_session_enc.sql`
- **Committed in:** `437d999`

**2. [Rule 2 - Missing Critical] Fixture mode on runFacebookCrawler for CI tracer**
- **Found during:** Task 4 (E2E without live credentials)
- **Issue:** Live Playwright crawl blocked without FB_SESSION_JSON/PROXY_URL
- **Fix:** Added `fixtureGraphqlBodies` option + `crawler.test.ts` integration proving crawl→normalize path
- **Files modified:** `scraper/src/facebook/crawler.ts`, `scraper/src/facebook/crawler.test.ts`
- **Committed in:** `437d999`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical for CI)
**Impact on plan:** No scope creep; live operator crawl still required for production validation (Plan 18-07 UAT)

## Issues Encountered

- Plan verify command uses vitest `-x` flag unsupported in current vitest CLI — ran equivalent tests without flag (all pass)

## User Setup Required

- Apply migration `030_facebook_session_enc.sql` via Supabase (Supavisor pooler if direct IPv6 unreachable)
- Set `SCRAPER_SECRETS_KEY` (same key as proxy_enc)
- Operator: upload session via admin UI (Plan 18-05) or `FB_SESSION_JSON` for local worker runs
- `PROXY_URL` required for live facebook crawl (D-18-08)

## Known Stubs

| File | Reason | Future plan |
|------|--------|-------------|
| `scraper/src/worker.ts` | Uses `config.urls.slice(0,1)` tracer scope | 18-03 full 6-URL matrix |
| Live `probeFacebookSession` | Requires Playwright + proxy at runtime | Operator credentials in 18-07 UAT |

## Next Phase Readiness

- Worker routing and persist path proven on fixture tracer — ready for Plan 18-03 full crawl expansion
- Admin session upload UI still deferred to Plan 18-05

## Self-Check: PASSED

- FOUND: supabase/migrations/030_facebook_session_enc.sql
- FOUND: scraper/src/facebook/crawler.ts
- FOUND: scraper/src/facebook/normalize.ts
- FOUND: commit 437d999

---
*Phase: 18-facebook-marketplace-scraping*
*Completed: 2026-08-15*
