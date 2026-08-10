---
phase: 12
slug: canonical-category-mapping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for canonical category mapping (CAT-01–03).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` |
| **Full suite command** | `npm run test:lib` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command for touched test file(s)
- **After every plan wave:** Run `npm run test:lib`
- **Before `/gsd-verify-work`:** Full lib suite green + grep UI boundary checks
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | CAT-01, CAT-03 | unit | `npm run test:lib -- lib/listings/canonical-categories.test.ts lib/listings/subito-categories.test.ts -x` | ✅ | ✅ green |
| 12-01-02 | 01 | 0 | D-19–D-24 | grep | ROADMAP/REQUIREMENTS/PROJECT doc gates | ✅ | ✅ green |
| 12-01-03 | 01 | 0 | Nyquist | file | `test -f .planning/phases/12-canonical-category-mapping/12-VALIDATION.md` | ✅ | ✅ green |
| 12-02-01 | 02 | 1 | CAT-01 | unit | `npm run test:lib -- lib/listings/subito-categories.test.ts -x` | ⬜ | ⬜ pending |
| 12-02-02 | 02 | 1 | CAT-01 | unit | `npm run test:lib -- lib/i18n/listing-fields.test.ts -x` | ⬜ | ⬜ pending |
| 12-02-03 | 02 | 1 | CAT-01 | unit | `npm run test:lib -- hooks/useDistanceCenter.test.ts -x` | ⬜ | ⬜ pending |
| 12-03-01 | 03 | 2 | CAT-02 | unit | `npm run test:lib -- lib/ugc/schemas.test.ts -x` | ✅ | ⬜ pending |
| 12-03-02 | 03 | 2 | CAT-02 | grep | `grep mapPostCategoryToSlug app/api/ugc/listings/route.ts` | ⬜ | ⬜ pending |
| 12-03-03 | 03 | 2 | D-12 | grep | `grep postCategory components/ugc/PostForm.tsx` | ⬜ | ⬜ pending |
| 12-04-01 | 04 | 3 | D-01/D-14/D-15 | grep | UI boundary grep (no folder IA) | ⬜ | ⬜ pending |
| 12-04-02 | 04 | 3 | CAT-03 | unit | `npm run test:lib` | ⬜ | ⬜ pending |
| 12-04-03 | 04 | 3 | CAT-01–03 | build | `npm run build` | ⬜ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/listings/canonical-categories.ts` — resolver + mapping tables
- [x] `lib/listings/canonical-categories.test.ts` — CAT-01, D-09, D-11, D-18 coverage
- [x] Planning docs updated (ROADMAP, REQUIREMENTS, PROJECT) per D-19–D-24

---

## Integration Audit (Plan 04)

| Check | Result |
|-------|--------|
| No folder tiles / drill-down in `FavoritesPageClient.tsx` | ⬜ pending |
| `FilterSheet` still uses `SUBITO_CATEGORY_SLUGS` | ⬜ pending |
| `PostForm` category picker uses `messages.post.categories` | ⬜ pending |
| No `legacySlugFromInferred` outside canonical module | ⬜ pending |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FilterSheet 17-category checklist unchanged | D-14 | Visual unchanged | Open filter sheet; confirm 17 Subito labels |
| Favorites flat two-column grid | D-01/D-15 | No folder IA | Open `/favorites`; confirm flat grid only |
| PostForm category picker labels | D-12 | i18n unchanged | Post flow; confirm six friendly labels |

---

## ROADMAP Success Criteria (D-22)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Resolver works for Subito/UGC/inference | `canonical-categories.test.ts` |
| 2 | New UGC posts persist category slug | route grep + `schemas.test.ts` |
| 3 | Mapping documented + tests pass | JSDoc tables + lib suite |
| 4 | FilterSheet behavior unchanged | integration grep + manual |
