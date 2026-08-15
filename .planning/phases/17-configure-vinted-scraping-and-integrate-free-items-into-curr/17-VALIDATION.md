---
phase: 17
slug: configure-vinted-scraping-and-integrate-free-items-into-curr
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-15
validated: 2026-08-15
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (root `vitest.config.ts` + `scraper/vitest.config.ts`) |
| **Config file** | `/vitest.config.ts`, `/scraper/vitest.config.ts` |
| **Quick run command** | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` |
| **Full suite command** | `npm run test:lib && cd scraper && npm test` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd scraper && npm test -- src/vinted/ -x`
- **After every plan wave:** Run `npm run test:lib && cd scraper && npm test`
- **Before `/gsd-verify-work`:** Wave 0 artifact PASS + full suite green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-W0 | 01 | 0 | Wave 0 spike | T-17-SSRF | Admin URLs vinted.it only | manual/env | `node scraper/scripts/spike-vinted-catalog.mjs` | ✅ | ✅ green |
| 17-E01 | 02+ | 1+ | SCRP-E01 | T-17-JSON | Map known fields only; zod schema | unit | `cd scraper && npm test -- src/vinted/http-extract.test.ts -x` | ✅ | ✅ green |
| 17-E02 | 02+ | 1+ | D-17-01/04 | — | €0 only; reject non-free at extract | unit | `cd scraper && npm test -- src/vinted/filters.test.ts -x` | ✅ | ✅ green |
| 17-E03 | 02+ | 1+ | D-17-15 | — | Reject shipping-only listings | unit | `cd scraper && npm test -- src/vinted/filters.test.ts -x` | ✅ | ✅ green |
| 17-E04 | 02+ | 1+ | D-17-07/11 | — | Bbox reject outside Venice/Padova | unit | `scraper/src/shared/schema.test.ts` | ✅ | ✅ green |
| 17-E05 | 03+ | 2+ | CAT-01 | — | Vinted resolver branch | unit | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` | ✅ | ✅ green |
| 17-E06 | 03+ | 2+ | CAT-03 | — | Vinted→Subito map coverage | unit | same | ✅ | ✅ green |
| 17-E07 | 04+ | 3+ | D-17-23 | T-17-PII | No seller email/phone persist | unit | schema + persist tests | ✅ | ✅ green |
| 17-E08 | 05+ | 4+ | D-17-26/29 | — | Source badge + FREE on grid | unit/component | card + external-url tests | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `scraper/scripts/spike-vinted-catalog.mjs` — live gate (manual)
- [x] `scraper/fixtures/vinted-catalog-api-sample.json` — captured API fragment
- [x] `scraper/fixtures/vinted-item-detail-fragment.json` — shipping + catalog_id
- [x] `scraper/src/vinted/http-extract.test.ts` — fixture-based parse tests
- [x] `scraper/src/vinted/filters.test.ts` — €0, pickup, city intent
- [x] `lib/listings/vinted-category-map.test.ts` or extend `canonical-categories.test.ts`
- [x] `lib/admin/vinted-recommended-seed.ts` — default Venice + Padova URL templates

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Live 3-URL Vinted catalog spike | Wave 0 gate (D-17-36) | Live vinted.it; session cookies | Run spike script; record in `17-SPIKE-VINTED-CATALOG.md` | ✅ PASS |
| Admin source flip + manual first run | D-17-34 | Operator workflow | Flip vinted to live, review seeded URLs, trigger manual run | ⬜ UAT pending |
| Mixed feed with Vinted + Subito | D-17-25 | Needs persisted listings | Verify chronological sort in dev feed after crawl | ⬜ UAT pending |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Automated gate:** `npm run test:lib` 416/416 + `cd scraper && npm test` 183/183 — exit 0 (2026-08-15, Plan 17-07 Task 1)

**Approval:** automated PASS; human UAT pending (Plan 17-07 Task 2)
