---
phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper
plan: 04
subsystem: scraper
tags: [proxy, subito, cost-optimization, PROXY-C03, provider-compare]

requires:
  - phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper
    provides: spike-subito-proxy-matrix.mjs and cost verdict (Plan 02)
  - phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper
    provides: 7-day direct spike methodology and STAY_DIRECT gate (Plan 03)
provides:
  - run-provider-compare-spike.mjs orchestrator for Webshare/Decodo/IPRoyal matrix
  - 16-SPIKE-PROVIDER-COMPARE.md with direct baseline, SKIP rows, and deferred recommendation
  - Human-approved STAY_DIRECT path — residential provider compare gated on NEED_RESIDENTIAL
affects:
  - Plan 16-05 ADR finalization (only if 7-day direct gate fails)

tech-stack:
  added: []
  patterns:
    - "Provider compare invokes spike-subito-proxy-matrix.mjs per label with masked credentials"
    - "Missing creds → SKIP row, not throw — compare survives partial credential sets"
    - "pass_rate ≥ 0.5 threshold matches production decision ladder"

key-files:
  created:
    - scraper/scripts/run-provider-compare-spike.mjs
    - .planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-SPIKE-PROVIDER-COMPARE.md
  modified:
    - .planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-SPIKE-PROVIDER-COMPARE.md

key-decisions:
  - "Operator skipped-direct-pass: STAY_DIRECT acceptable; residential provider spikes deferred"
  - "Full Webshare/Decodo/IPRoyal compare runs only if 16-DECISION-GATE returns NEED_RESIDENTIAL"
  - "Direct baseline row (0/5 blocked, 100% pass_rate) recorded for reference"

patterns-established:
  - "PROXY-C03 tooling ready but execution deferred until residential need proven by 7-day gate"

requirements-completed: [PROXY-C03]

coverage:
  - id: D1
    description: "run-provider-compare-spike.mjs orchestrates matrix per provider with SKIP on missing creds"
    requirement: PROXY-C03
    verification:
      - kind: other
        ref: "node --check scraper/scripts/run-provider-compare-spike.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "16-SPIKE-PROVIDER-COMPARE.md has provider table with pass_rate, masked hosts, SKIP reasons"
    requirement: PROXY-C03
    verification:
      - kind: other
        ref: "grep -cE 'pass_rate|SKIP|direct' 16-SPIKE-PROVIDER-COMPARE.md (≥2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Recommended provider section documents STAY_DIRECT with deferred compare until NEED_RESIDENTIAL"
    requirement: PROXY-C03
    verification:
      - kind: other
        ref: "16-SPIKE-PROVIDER-COMPARE.md Recommended provider section"
        status: pass
    human_judgment: true
    rationale: "Operator verdict skipped-direct-pass (2026-08-12); residential compare deferred"

duration: 12min
completed: 2026-08-12
status: complete
---

# Phase 16 Plan 04: Provider Compare (PROXY-C03) Summary

**Provider compare orchestrator and artifact with direct baseline; human-approved STAY_DIRECT — residential provider matrix deferred until 7-day gate fails**

## Performance

- **Duration:** ~12 min (tasks 1–2 automated; task 3 human-approved continuation)
- **Started:** 2026-08-12T15:04:18Z
- **Completed:** 2026-08-12T15:11:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- `run-provider-compare-spike.mjs`: orchestrates Webshare, Decodo, IPRoyal, and direct baseline via `spike-subito-proxy-matrix.mjs`; masks proxy URLs; SKIP rows when credentials missing
- `16-SPIKE-PROVIDER-COMPARE.md`: reference cost table ($1.40 Webshare vs $2.00 Decodo), comparison results, recommended provider section
- Direct baseline measured: 0/5 blocked, 100% pass_rate, 119ms mean latency (PARTIAL — residential rows skipped)
- Human checkpoint `skipped-direct-pass`: operator will run 7-day direct production spike first; full provider compare only if gate returns NEED_RESIDENTIAL

## Task Commits

Each task was committed atomically:

1. **Task 1: Provider compare orchestrator + artifact template** - `3e89e52` (feat)
2. **Task 2: Run available provider matrix spikes and write verdict** - `ac9e68b` (feat)
3. **Task 3: Human verify — provider matrix comparison** - `f90ecea` (feat) — operator verdict `skipped-direct-pass`

## Files Created/Modified

- `scraper/scripts/run-provider-compare-spike.mjs` - Multi-provider matrix orchestrator with SKIP handling
- `.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-SPIKE-PROVIDER-COMPARE.md` - Comparison artifact with direct baseline and deferred recommendation

## Decisions Made

- STAY_DIRECT is acceptable given current gate PASS; no residential spend until proven necessary
- Webshare/Decodo/IPRoyal SKIP rows acceptable — credentials not required for this plan completion
- Re-run `run-provider-compare-spike.mjs` only when `16-DECISION-GATE` returns NEED_RESIDENTIAL after operator's 7-day direct spike

## Deviations from Plan

None - plan executed as written with operator-approved checkpoint deferral (resume signal `skipped-direct-pass` documented in artifact).

## Issues Encountered

None

## User Setup Required

Deferred until NEED_RESIDENTIAL:

- `WEBSHARE_PROXY_USERNAME` / `WEBSHARE_PROXY_PASSWORD` — Webshare trial comparison
- `DECODO_PROXY_USERNAME` / `DECODO_PROXY_PASSWORD` or `SCRAPER_PROXY_URL` — Decodo baseline
- Optional `IPROYAL_PROXY_USERNAME` / `IPROYAL_PROXY_PASSWORD`

## Next Phase Readiness

- PROXY-C03 complete with tooling ready and deferred execution documented
- Operator runs 7-day direct production spike (Plan 16-03 methodology)
- Plan 16-05 finalizes ADR cost ladder when gate data available; provider compare re-run if NEED_RESIDENTIAL

## Self-Check: PASSED

- FOUND: scraper/scripts/run-provider-compare-spike.mjs
- FOUND: .planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-SPIKE-PROVIDER-COMPARE.md
- FOUND: 3e89e52, ac9e68b, f90ecea

---
*Phase: 16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper*
*Completed: 2026-08-12*
