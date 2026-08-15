---
phase: 18-facebook-marketplace-scraping
plan: 01
subsystem: scraping
tags: [playwright, graphql, facebook, marketplace, spike, fixtures, vitest]

requires:
  - phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
    provides: Wave 0 spike pattern, fixture-driven unit test scaffold
provides:
  - Facebook Wave 0 spike script with GraphQL intercept
  - Mock GraphQL + detail fixtures for CI
  - graphql-extract, filters, session probe modules + tests
  - 18-SPIKE-FACEBOOK-MARKETPLACE.md artifact (FAIL live; scaffold approved)
affects:
  - 18-02-PLAN (graphql-extract.ts implementation)
  - 18-03+ (crawler, session_enc, admin UI)

tech-stack:
  added: []
  patterns:
    - "Playwright + POST /api/graphql/ response intercept (D-18-07 option-a)"
    - "Fixture-only vitest for facebook/ module (no live network in CI)"
    - "Spike env gates: FB_SESSION_JSON + PROXY_URL exit 1"

key-files:
  created:
    - scraper/scripts/spike-facebook-marketplace.mjs
    - scraper/fixtures/facebook-search-graphql-sample.json
    - scraper/fixtures/facebook-item-detail-fragment.json
    - scraper/src/facebook/graphql-extract.ts
    - scraper/src/facebook/filters.ts
    - scraper/src/facebook/session.ts
    - scraper/src/facebook/graphql-extract.test.ts
    - scraper/src/facebook/filters.test.ts
    - scraper/src/facebook/session.test.ts
    - .planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md
  modified: []

key-decisions:
  - "D-18-07 option-a: PlaywrightCrawler + GraphQL intercept (user-approved Task 1)"
  - "Human approved Wave 0 scaffold despite Verdict FAIL — mock fixtures + documented field map sufficient to start Plan 18-02; live PASS deferred until operator provides FB_SESSION_JSON + PROXY_URL"

patterns-established:
  - "Spike mirrors spike-vinted-catalog.mjs: REPO_ROOT, SPIKE_MD, per-URL loop, verdict exit code"
  - "isFacebookFreePrice accepts 0, Gratis formatted_amount; rejectReasonIfNotFacebookFree returns price_ambiguous for missing price"

requirements-completed: [SCRP-E01, D-18-05, D-18-07, D-18-08, D-18-19, D-18-20, D-18-30]

coverage:
  - id: D1
    description: "Wave 0 spike script with Playwright GraphQL intercept on 3 Venice URLs"
    requirement: D-18-30
    verification:
      - kind: unit
        ref: "test -f scraper/scripts/spike-facebook-marketplace.mjs"
        status: pass
    human_judgment: true
    rationale: "Live spike not executed — FB_SESSION_JSON/PROXY_URL absent; human approved scaffold-only delivery"
  - id: D2
    description: "GraphQL field map documented for Plan 18-02 graphql-extract.ts"
    requirement: SCRP-E01
    verification: []
    human_judgment: true
    rationale: "Field map from 18-RESEARCH + mock fixtures; live confirmation pending operator credentials"
  - id: D3
    description: "Fixture-driven unit tests (graphql-extract, filters, session) pass without network"
    requirement: SCRP-E01
    verification:
      - kind: unit
        ref: "scraper/src/facebook/graphql-extract.test.ts"
        status: pass
      - kind: unit
        ref: "scraper/src/facebook/filters.test.ts"
        status: pass
      - kind: unit
        ref: "scraper/src/facebook/session.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "18-SPIKE-FACEBOOK-MARKETPLACE.md with Verdict line and gate criteria"
    requirement: D-18-19
    verification:
      - kind: other
        ref: "grep 'Verdict: FAIL' .planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md"
        status: pass
    human_judgment: true
    rationale: "Verdict FAIL on live gate; human explicitly approved proceeding with scaffold (Task 3)"

duration: 35min
completed: 2026-08-15
status: complete
---

# Phase 18 Plan 01: Wave 0 Facebook Spike Summary

**Playwright GraphQL-intercept spike scaffold with mock fixtures, extract/filter/session helpers, and human-approved FAIL artifact pending live operator credentials**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-15T14:57:00Z
- **Completed:** 2026-08-15T16:32:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Locked D-18-07 approach: Playwright + `/api/graphql/` intercept (option-a)
- Delivered `spike-facebook-marketplace.mjs` with session/proxy env gates, 3 Venice URLs, session probe, GraphQL card parse
- Created research-shaped mock fixtures and 9 passing fixture-only unit tests
- Produced `18-SPIKE-FACEBOOK-MARKETPLACE.md` with **Verdict: FAIL** (no live credentials); human approved scaffold for Plan 18-02

## Task Commits

1. **Task 1: Confirm Wave 0 approach (D-18-07)** — decision recorded (option-a); no code commit
2. **Task 2: Spike script, fixtures, unit test scaffolds** — `b450dee` (test), `e4cbdf3` (feat)
3. **Task 3: Human verify Wave 0 spike** — approved by user (scaffold despite FAIL live gate)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `scraper/scripts/spike-facebook-marketplace.mjs` — Wave 0 Playwright spike
- `scraper/src/facebook/graphql-extract.ts` — parse MarketplaceSearch feed_units
- `scraper/src/facebook/filters.ts` — isFacebookFreePrice, rejectReasonIfNotFacebookFree
- `scraper/src/facebook/session.ts` — classifySessionProbeUrl, hasAuthCookie
- `scraper/fixtures/facebook-search-graphql-sample.json` — mock GraphQL search fragment
- `scraper/fixtures/facebook-item-detail-fragment.json` — mock detail/pickup fields
- `.planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md` — spike artifact

## Decisions Made

- D-18-07 option-a: PlaywrightCrawler + GraphQL intercept (recommended; user-selected Task 1)
- Task 3 human approval: proceed with scaffold + documented field map despite live **Verdict: FAIL** — implementation waves may start; live PASS remains operator follow-up before production enable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed malformed mock fixture JSON**
- **Found during:** Task 2
- **Issue:** `facebook-search-graphql-sample.json` had `edges` array closed with `}` instead of `]`
- **Fix:** Corrected JSON structure so vitest fixture loader parses
- **Files modified:** `scraper/fixtures/facebook-search-graphql-sample.json`
- **Verification:** vitest 9/9 pass
- **Committed in:** `e4cbdf3`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for fixture tests to run; no scope creep.

## Issues Encountered

- Live spike blocked: `FB_SESSION_JSON` and `PROXY_URL` not available in executor environment
- SPIKE artifact records **Verdict: FAIL**; user explicitly approved scaffold-only gate clearance for Plan 18-02

## Authentication Gates

None — operator Facebook session and residential proxy deferred to user setup before live spike re-run.

## Known Stubs

| File | Description |
|------|-------------|
| `18-SPIKE-FACEBOOK-MARKETPLACE.md` | Live extract not proven; field map from research/mock pending live confirmation |
| `scraper/fixtures/facebook-search-graphql-sample.json` | Mock data — not captured from live GraphQL intercept |

## User Setup Required

Operator must provide before live spike PASS:
- `FB_SESSION_JSON` — Playwright storageState or cookie array export
- `PROXY_URL` — Italian residential proxy (D-18-08)

Re-run: `FB_SESSION_JSON=… PROXY_URL=… node scraper/scripts/spike-facebook-marketplace.mjs`

## Next Phase Readiness

- Plan 18-02 may implement `graphql-extract.ts` using documented field map + fixtures
- Live Wave 0 PASS still recommended before enabling facebook crawler in production (D-18-20)
- Operator should re-run spike when credentials available to flip artifact to **Verdict: PASS**

---
*Phase: 18-facebook-marketplace-scraping*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: scraper/scripts/spike-facebook-marketplace.mjs
- FOUND: scraper/fixtures/facebook-search-graphql-sample.json
- FOUND: scraper/fixtures/facebook-item-detail-fragment.json
- FOUND: scraper/src/facebook/graphql-extract.ts
- FOUND: scraper/src/facebook/filters.ts
- FOUND: scraper/src/facebook/session.ts
- FOUND: .planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md
- FOUND: b450dee
- FOUND: e4cbdf3
