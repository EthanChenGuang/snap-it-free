---
phase: 08
slug: subito-regalo-url-matrix-venice-padova-veneto-all-categories
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-05
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (root) + Vitest 3.0.0 (scraper) |
| **Config file** | `vitest.config.ts`, `scraper/vitest.config.ts` |
| **Quick run command** | `npm test` (root lib/) + `cd scraper && npm test` |
| **Full suite command** | `npm test && cd scraper && npm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run affected package tests only
- **After every plan wave:** Run `npm test && cd scraper && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + Padova spike PASS
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | D-15 | — | Padova URL returns 200 + listings | integration | `node scraper/scripts/spike-subito-padova.mjs` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | D-25/D-26/D-28 | — | Migration adds city/region + view rewrite | unit | `npm test -- lib/listings/queries.test.ts -x` | ✅ extend | ⬜ pending |
| 08-03-01 | 03 | 2 | D-18 | — | Category parser reads detail URL slug | unit | `cd scraper && npm test -- src/subito/normalize.test.ts -x` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 2 | SCRP-01 ext | — | Padova geo bbox accepts coords | unit | `cd scraper && npm test -- src/subito/extract.test.ts -x` | ✅ extend | ⬜ pending |
| 08-04-01 | 04 | 3 | D-03/D-06 | T-08-01 | Padova URL validation + dedupe | unit | `npm test -- lib/admin/url-validate.test.ts -x` | ✅ extend | ⬜ pending |
| 08-04-02 | 04 | 3 | D-04/D-16 | — | URL builder 17×2 dedupe | unit | `npm test -- lib/admin/subito-regalo-catalog.test.ts -x` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 4 | D-22/D-28 | — | filterByZone All includes zone-null+coords | unit | `npm test -- lib/listings/filters.test.ts -x` | ✅ extend | ⬜ pending |
| 08-05-02 | 05 | 4 | D-29/D-30 | — | Category chip match prefers DB slug | unit | `npm test -- lib/listings/subito-categories.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scraper/scripts/spike-subito-padova.mjs` — D-15 gate
- [ ] `scraper/src/subito/normalize.test.ts` — D-18 parser cases
- [ ] `lib/admin/subito-regalo-catalog.test.ts` — URL builder + dedupe
- [ ] `lib/listings/subito-categories.test.ts` — label + filter helper
- [ ] Extend `lib/admin/url-validate.test.ts` — Padova paths
- [ ] Extend `lib/listings/filters.test.ts` — D-22 All behavior
- [ ] Extend `lib/listings/queries.test.ts` — remove zone-not-null expectation
- [ ] Migration `020_subito_location_category.sql`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin matrix Stitch compliance | D-01/D-08 | Visual audit | Compare `/admin/sources/subito` to phase08 Stitch prototypes |
| Seed overwrite confirm dialog | D-14 | Radix Dialog UX | Apply recommended seed with existing URLs; confirm replace flow |
| Padova pins on map | D-21/D-23 | Browser geo | Pan map east; verify Padova listing pins appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
