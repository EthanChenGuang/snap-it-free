---
phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper
plan: 02
subsystem: scraper
tags: [proxy, subito, cost-optimization, PROXY-C01, adr-015]

requires:
  - phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper
    provides: PROXY-C04 quota fallback (Plan 01)
  - phase: 15-scraper-incremental-crawl-and-search-efficiency
    provides: HttpCrawler spike PASS without proxy, degraded gate (D-15-18)
provides:
  - 16-PROXY-COST-VERDICT.md honest cost verdict (no free residential pool)
  - REQUIREMENTS PROXY-C01–C05 traceability rows
  - ADR 015 Cost ladder draft with 50% blocked_ratio_7d gate
  - spike-subito-proxy-matrix.mjs for direct vs proxy matrix comparison
  - aggregate-block-rate.mjs for 7-day decision gate math
affects:
  - 16-03 through 16-05 production measurement and ADR finalization plans

tech-stack:
  added: []
  patterns:
    - "Cost ladder: direct → Webshare free → Webshare paid → IPRoyal → Decodo"
    - "blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count) gate at 0.5"
    - "Spike artifacts mask proxy credentials (host only)"

key-files:
  created:
    - .planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-PROXY-COST-VERDICT.md
    - scraper/scripts/spike-subito-proxy-matrix.mjs
    - scraper/scripts/aggregate-block-rate.mjs
  modified:
    - .planning/REQUIREMENTS.md
    - docs/adr/015-production-proxy.md

key-decisions:
  - "No sustainable free residential IP network — OSS managers require paid upstream IPs"
  - "Residential proxy demoted from required to recommended when blocked_ratio_7d ≥ 0.5"
  - "Direct crawl is tier-1 default; Webshare free 1GB/mo is cheapest paid validation path"

patterns-established:
  - "PROXY-C01 foundation: verdict doc + spike/aggregate scripts unblock Wave 2 measurement"

requirements-completed: [PROXY-C01]

coverage:
  - id: D1
    description: "16-PROXY-COST-VERDICT.md documents honest no-free-residential verdict and cost ladder decision tree"
    requirement: PROXY-C01
    verification:
      - kind: other
        ref: ".planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-PROXY-COST-VERDICT.md"
        status: pass
    human_judgment: true
    rationale: "Operator approved verdict matches expectations (checkpoint task 3, 2026-08-12)"
  - id: D2
    description: "REQUIREMENTS.md defines PROXY-C01–C05 with Phase 16 traceability"
    requirement: PROXY-C01
    verification:
      - kind: other
        ref: "grep -c 'PROXY-C0[1-5]' .planning/REQUIREMENTS.md (≥5)"
        status: pass
    human_judgment: false
  - id: D3
    description: "ADR 015 Cost ladder draft with 50% gate and provider tier ordering"
    requirement: PROXY-C01
    verification:
      - kind: other
        ref: "docs/adr/015-production-proxy.md#cost-ladder-phase-16-draft"
        status: pass
    human_judgment: true
    rationale: "Operator approved tier ordering and 50% gate (checkpoint task 3, 2026-08-12)"
  - id: D4
    description: "spike-subito-proxy-matrix.mjs runs URL matrix with --direct/--proxy-url and masked artifact output"
    requirement: PROXY-C01
    verification:
      - kind: other
        ref: "node --check scraper/scripts/spike-subito-proxy-matrix.mjs"
        status: pass
    human_judgment: false
  - id: D5
    description: "aggregate-block-rate.mjs computes blocked_ratio_7d from scrape_runs for decision gate"
    requirement: PROXY-C01
    verification:
      - kind: other
        ref: "node --check scraper/scripts/aggregate-block-rate.mjs"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-12
status: complete
---

# Phase 16 Plan 02: PROXY-C01 Cost Verdict Foundation Summary

**Honest proxy cost verdict (no free residential pool), PROXY-C01–C05 requirements, ADR cost ladder draft, and spike/aggregate scripts for Wave 2 measurement**

## Performance

- **Duration:** 5 min (tasks 1–2 automated; task 3 human-approved)
- **Started:** 2026-08-12T14:56:01Z
- **Completed:** 2026-08-12T14:59:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Formalized `16-PROXY-COST-VERDICT.md`: executive summary table, OSS vs infrastructure distinction, explicit "no free residential pool" verdict, 50% block-rate decision tree
- Added REQUIREMENTS.md `### Proxy Cost Optimization (Phase 16)` with PROXY-C01–C05 and traceability rows
- ADR 015 `## Cost ladder (Phase 16 draft)`: direct → Webshare free → Webshare paid → IPRoyal → Decodo with residential demotion at `blocked_ratio_7d ≥ 0.5`
- `spike-subito-proxy-matrix.mjs` for live matrix comparison (`--direct`, `--proxy-url`, `--label`, `--out`) with credential masking
- `aggregate-block-rate.mjs` for 7-day Supabase `scrape_runs` blocked ratio (canonical formula for Plan 16-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Formalize PROXY-C01 verdict + REQUIREMENTS PROXY-C01–C05** - `8e7958e` (feat)
2. **Task 2: ADR 015 cost ladder draft + spike/aggregate scripts** - `3f2ee44` (feat)
3. **Task 3: Human verify — PROXY-C01 verdict and ADR cost ladder draft** - operator approved 2026-08-12 (no code changes)

**Plan metadata:** `a2cf75d` (docs: complete plan)

## Files Created/Modified

- `.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-PROXY-COST-VERDICT.md` - Research verdict and operator decision tree
- `.planning/REQUIREMENTS.md` - PROXY-C01–C05 definitions and traceability
- `docs/adr/015-production-proxy.md` - Cost ladder draft section with 50% gate
- `scraper/scripts/spike-subito-proxy-matrix.mjs` - Live Subito URL matrix spike with masked artifacts
- `scraper/scripts/aggregate-block-rate.mjs` - 7-day blocked ratio aggregation for decision gate

## Decisions Made

- Verdict locks honest operator guidance: OSS proxy managers do not eliminate paid IP cost
- Residential proxy requirement demoted to recommendation gated on 7-day 50% block ratio
- Direct crawl remains tier-1 default leveraging Phase 15 spike PASS and PROXY-C04 fallback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

Optional for Wave 2 spikes:

- `SCRAPER_PROXY_URL` — operator proxy for matrix comparison runs
- Outbound HTTPS to live Subito category URLs for `spike-subito-proxy-matrix.mjs`

## Next Phase Readiness

- PROXY-C01 complete; Wave 2 plans 16-03/16-04 can run 7-day direct spike and provider comparison
- Run `node scraper/scripts/aggregate-block-rate.mjs --days 7` after production data accumulates
- ADR cost ladder finalized in Plan 16-05 (PROXY-C05)

## Self-Check: PASSED

- FOUND: .planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-PROXY-COST-VERDICT.md
- FOUND: scraper/scripts/spike-subito-proxy-matrix.mjs
- FOUND: scraper/scripts/aggregate-block-rate.mjs
- FOUND: 8e7958e, 3f2ee44

---
*Phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper*
*Completed: 2026-08-12*
