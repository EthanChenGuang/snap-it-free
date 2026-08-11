---
phase: 15
slug: scraper-incremental-crawl-and-search-efficiency
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3 / 3.2.7 |
| **Config file** | scraper package defaults (vitest run) |
| **Quick run command** | `cd scraper && npm test` |
| **Full suite command** | `cd scraper && npm test` (+ admin `lib/admin/*.test.ts` via root if configured) |
| **Estimated runtime** | ~30–90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd scraper && npm test`
- **After every plan wave:** Run full scraper vitest + relevant admin schema tests
- **Before `/gsd-verify-work`:** Full suite must be green + spike artifact PASS + ADRs present
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-W0 | 01 | 0 | SCRP-E01/E06 | — | N/A | manual/env-gated | `node scraper/scripts/spike-subito-http-category.mjs` | ❌ W0 | ⬜ pending |
| 15-E01 | 02+ | 1+ | SCRP-E01 | T-15-JSON | Map known fields only; zod RawListing | unit | `cd scraper && npx vitest run src/subito/http-extract.test.ts` | ❌ W0 | ⬜ pending |
| 15-E02 | 02+ | 1+ | SCRP-E02 | — | N/A | unit | `cd scraper && npx vitest run src/subito/early-stop.test.ts` | ❌ W0 | ⬜ pending |
| 15-E03 | 02+ | 1+ | SCRP-E03 | — | N/A | unit | early-stop + persist touch tests | ❌ / ✅ partial | ⬜ pending |
| 15-E04 | 03+ | 2+ | SCRP-E04 | — | N/A | unit | `cd scraper && npx vitest run src/subito/fallback-queue.test.ts` | ❌ W0 | ⬜ pending |
| 15-E05 | 03+ | 2+ | SCRP-E05 | T-15-PROXY | Never log decrypted proxy URL | unit | `cd scraper && npx vitest run src/worker-proxy-gate.test.ts` | ❌ W0 | ⬜ pending |
| 15-E06 | 01 | 0 | SCRP-E06 | — | N/A | docs | stack ADR + spike md present | ❌ W0 | ⬜ pending |
| 15-E07 | 02+ | 1+ | SCRP-E07 | — | N/A | unit | worker finishScrapeRun metrics tests | ❌ W0 | ⬜ pending |
| 15-E08 | 02+ | 1+ | SCRP-E08 | T-15-EMPTY | Validation gate before persist | unit | extend `validate-run.test.ts` | ✅ partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scraper/scripts/spike-subito-http-category.mjs` — live HttpCrawler + optional Scrapling compare + TLS timing
- [ ] `.planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-SPIKE-HTTP-CATEGORY.md` — field map, pass/fail, Venezia arredamento-casalinghi
- [ ] `scraper/src/subito/http-extract.test.ts` + fixtures under phase dir or `scraper/fixtures/`
- [ ] `scraper/src/subito/early-stop.test.ts`
- [ ] Extend `validate-run.test.ts` for JSON completeness + incremental ratio
- [ ] Migration SQL draft for metrics / crawl_content_hash / config columns
- [ ] Extend `CreateJobSchema` tests for `crawl_mode`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live 3-URL HTTP category spike (incl. Venezia arredamento-casalinghi) | SCRP-E01, SCRP-E06 | Live Subito; D-15-33 env-gated only | Run spike script; record field map + pass/fail in `15-SPIKE-HTTP-CATEGORY.md` |
| Stack ADR + proxy ADR present | SCRP-E05, SCRP-E06 | Documentation gate | Confirm ADRs in phase/docs before verify-work |
| ≥10× fewer requests / ≤8 min wall time on 34-URL matrix | SCRP-E07 / D-15-29 | Needs production-like matrix run | Compare scrape_runs metrics vs baseline after shadow cutover |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
