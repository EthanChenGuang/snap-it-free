---
phase: 15-scraper-incremental-crawl-and-search-efficiency
plan: 01
subsystem: infra
tags: [crawlee, got-scraping, subito, spike, adr, http-crawler]

requires: []
provides:
  - Wave 0 HTTP category spike script and PASS artifact with __NEXT_DATA__ field map
  - Sanitized category JSON fixture for Plan 15-03 unit tests
  - Stack ADR locking Crawlee HttpCrawler primary + Playwright secondary
  - Production proxy ADR with soft degraded gate
affects:
  - 15-03-PLAN.md
  - 15-04-PLAN.md
  - 15-05-PLAN.md

tech-stack:
  added: []
  patterns:
    - "got-scraping TLS fetch for category __NEXT_DATA__ extraction"
    - "ADR-gated stack lock before implementation waves"

key-files:
  created:
    - scraper/scripts/spike-subito-http-category.mjs
    - scraper/fixtures/subito-category-next-data-fragment.json
    - .planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-SPIKE-HTTP-CATEGORY.md
    - docs/adr/015-scraper-http-stack.md
    - docs/adr/015-production-proxy.md
  modified: []

key-decisions:
  - "HttpCrawler (got-scraping) wins Wave 0 spike — Scrapling arm skipped per D-15-03 default"
  - "Listing array path locked: props.pageProps.initialState.items.originalList"
  - "Validation gate shifts to JSON completeness ≥0.9 with mode-aware min count ratios"
  - "Production proxy: Italian residential required; soft degraded gate when unset"

patterns-established:
  - "Wave 0 spike writes phase SPIKE md + sanitized fixture for downstream TDD"
  - "USE_HTTP_CRAWLER off|shadow|on with operator flip after 3 green shadow runs"

requirements-completed: [SCRP-E01, SCRP-E05, SCRP-E06]

coverage:
  - id: D1
    description: "HTTP category spike script extracts required JSON fields from 3 live Subito URLs"
    requirement: SCRP-E01
    verification:
      - kind: other
        ref: "node scraper/scripts/spike-subito-http-category.mjs (exit 0, overall PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Spike artifact documents field map, timing, TLS note, and arredamento-casalinghi Venezia path"
    requirement: SCRP-E01
    verification:
      - kind: other
        ref: "grep PASS 15-SPIKE-HTTP-CATEGORY.md && grep arredamento-casalinghi"
        status: pass
    human_judgment: true
    rationale: "Wave 0 hard gate — human checkpoint Task 2 criteria verified from artifact; orchestrator may re-confirm"
  - id: D3
    description: "Stack ADR locks Crawlee HttpCrawler primary, rejects Apify for Phase 15"
    requirement: SCRP-E06
    verification:
      - kind: other
        ref: "grep HttpCrawler docs/adr/015-scraper-http-stack.md"
        status: pass
    human_judgment: false
  - id: D4
    description: "Proxy ADR documents residential requirement and soft degraded gate"
    requirement: SCRP-E05
    verification:
      - kind: other
        ref: "grep residential docs/adr/015-production-proxy.md && grep degraded"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-11
status: complete
---

# Phase 15 Plan 01: Wave 0 HTTP Spike & ADR Lock Summary

**Live __NEXT_DATA__ category extraction proven on 3 Subito URLs (≤2s each); Crawlee HttpCrawler + proxy ADRs locked for Phase 15**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-11T17:59:00Z
- **Completed:** 2026-08-11T18:11:00Z
- **Tasks:** 3 (Task 2 checkpoint criteria verified from artifact; proceeded to ADRs)
- **Files modified:** 5 created

## Accomplishments

- Wave 0 spike PASS: Venezia arredamento-casalinghi, Padova, Veneto elettrodomestici — all fields extracted in 313–440ms
- Field map locked at `props.pageProps.initialState.items.originalList` with subject/price/images/date/urls mapping
- Sanitized fixture written for Plan 15-03 unit tests
- Stack ADR: HttpCrawler primary, Playwright fallback, Apify/Scrapling escape hatch only
- Proxy ADR: dev optional with warning; production residential + soft degraded gate

## Task Commits

1. **Task 1: Author and run Wave 0 HTTP category spike script** - `2aedb74` (feat)
2. **Task 2: Human verify Wave 0 spike PASS** - criteria verified from artifact (no separate commit)
3. **Task 3: Write stack ADR and production proxy ADR** - `219a72d` (docs)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `scraper/scripts/spike-subito-http-category.mjs` - Live got-scraping spike runner
- `scraper/fixtures/subito-category-next-data-fragment.json` - Sanitized __NEXT_DATA__ sample
- `.planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-SPIKE-HTTP-CATEGORY.md` - PASS artifact
- `docs/adr/015-scraper-http-stack.md` - SCRP-E06 stack decision
- `docs/adr/015-production-proxy.md` - SCRP-E05 proxy posture

## Decisions Made

- Crawlee/got-scraping default winner; Scrapling optional arm not executed (spike already PASS)
- Listing order treated as newest-first when dates monotonic descending
- No proxy during spike — documented warning per D-15-17

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint Note (Task 2)

Spike artifact shows **overall PASS** with all checkpoint criteria met (3/3 URLs, ≤2s, field map, arredamento-casalinghi, Crawlee winner). Proceeded to Task 3 per orchestrator instruction when artifact verification succeeds. Human may still type `approved` to acknowledge Wave 0 gate before Plans 15-03+.

## Issues Encountered

None

## User Setup Required

None - spike used direct HTTPS (no proxy env required for dev).

## Next Phase Readiness

Ready for **15-02-PLAN.md** (schema/migration wave) and **15-03-PLAN.md** (http-extract.ts using locked field map).

---
*Phase: 15-scraper-incremental-crawl-and-search-efficiency*
*Completed: 2026-08-11*

## Self-Check: PASSED

- FOUND: scraper/scripts/spike-subito-http-category.mjs
- FOUND: .planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-SPIKE-HTTP-CATEGORY.md
- FOUND: scraper/fixtures/subito-category-next-data-fragment.json
- FOUND: docs/adr/015-scraper-http-stack.md
- FOUND: docs/adr/015-production-proxy.md
- FOUND: commit 2aedb74
- FOUND: commit 219a72d
