---
phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
plan: 04
subsystem: admin
tags: [subito, regalo-url-matrix, admin, stitch, padova-gate, target-urls]

requires:
  - 08-01
provides:
  - RegaloUrlMatrix hybrid generator UI (D-01)
  - RECOMMENDED_SUBITO_SEED_URLS with Padova spike gate (D-04, D-15)
  - ReplaceUrlsConfirmDialog seed overwrite confirm (D-14)
  - Padova-aware validateTargetUrl (D-03)
affects:
  - 08-05 consumer category filters

tech-stack:
  added: []
  patterns:
    - "Matrix local state only; target_urls textarea is sole persistence (D-02)"
    - "Generate: deduped generated URLs first, then unique manual lines (D-05)"
    - "PADOVA_SPIKE_PASS constant gates recommended seed at 17 vs 34 URLs"

key-files:
  created:
    - lib/admin/subito-recommended-seed.ts
    - components/admin/RegaloUrlMatrix.tsx
    - components/admin/ReplaceUrlsConfirmDialog.tsx
  modified:
    - lib/admin/subito-regalo-catalog.ts
    - lib/admin/url-validate.ts
    - components/admin/SourceDetailClient.tsx
    - components/ui/dialog.tsx
    - scraper/src/subito/url-context.ts

key-decisions:
  - "Recommended seed is Venice-only (17 URLs) while 08-PADOVA-SPIKE.md verdict is FAIL (D-15)"
  - "Modal overlay dismiss and 保留当前 URL both cancel without mutating textarea (UI-SPEC E2)"

metrics:
  duration: 3min
  completed: 2026-08-05

status: complete
---

# Phase 08 Plan 04: Admin Regalo URL Matrix Summary

**One-liner:** Hybrid city×category matrix generator with Venice-only recommended seed (Padova gated), Padova path validation, and Stitch confirm modal for seed overwrite.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7009c1d | Catalog + recommended seed + Padova validation (TDD) |
| 2 | f2e67d8 | RegaloUrlMatrix component |
| 3 | d0abbb6 | Seed confirm modal + SourceDetailClient integration |

## What Shipped

- **lib/admin/subito-regalo-catalog.ts** — 17-slug catalog, `REGALO_CATEGORY_URL_REGEX`, `parseRegaloCategoryUrl`, `buildRegaloCategoryUrl`, `dedupeUrls`, `generateRegaloUrls`
- **lib/admin/subito-recommended-seed.ts** — `RECOMMENDED_SUBITO_SEED_URLS` (17 URLs, Venice-only while spike FAIL)
- **lib/admin/url-validate.ts** — accepts Venezia and Padova Veneto regalo paths; rejects evil.com and non-matching paths
- **components/admin/RegaloUrlMatrix.tsx** — Chinese chrome, Italian category labels with slug tooltips, generate/seed actions, preview count, ≥30 warning
- **components/admin/ReplaceUrlsConfirmDialog.tsx** — D-14 overwrite confirm with focus trap via Radix Dialog
- **components/admin/SourceDetailClient.tsx** — matrix above textarea for subito; save dedupes URLs

## Verification

- `npm test -- lib/admin/url-validate.test.ts lib/admin/subito-regalo-catalog.test.ts` — 15 tests pass
- `npm run build` — webpack compile succeeds (`✓ Compiled successfully`); pre-existing TS error in `lib/admin/cleanup.ts` unrelated to this plan

## E2 Backstop (Modal Dismiss)

Manual checklist for UI-SPEC E2 — verified by implementation review:

| Step | Expected | Status |
|------|----------|--------|
| Open modal with non-empty textarea | Modal shows current URL count | ✓ `currentCount` prop |
| Click 保留当前 URL | Modal closes; textarea unchanged | ✓ `onOpenChange(false)` only |
| Click overlay / Escape | Modal closes; textarea unchanged | ✓ `onPointerDownOutside` + `onEscapeKeyDown` dismiss without `onConfirmReplace` |
| Click Replace URLs | Textarea filled with seed; matrix all-checked | ✓ `applyRecommendedSeed` + `matrixResetToken` |
| Tab through modal | Focus trapped in dialog | ✓ Radix Dialog default focus trap |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Intentional Gate

- **Padova seed blocked (D-15):** `PADOVA_SPIKE_PASS = false` mirrors 08-PADOVA-SPIKE.md FAIL verdict. Recommended seed is 17 Venice URLs, not 34. Matrix UI still allows operator to generate Padova URLs manually; validation accepts Padova paths.

## Self-Check: PASSED

- FOUND: lib/admin/subito-recommended-seed.ts
- FOUND: components/admin/RegaloUrlMatrix.tsx
- FOUND: components/admin/ReplaceUrlsConfirmDialog.tsx
- FOUND: 7009c1d
- FOUND: f2e67d8
- FOUND: d0abbb6
