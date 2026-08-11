---
phase: quick-260811-hta
plan: 01
subsystem: listings-filter
tags: [i18n, category-filter, subito]
status: complete
dependency-graph:
  requires: []
  provides:
    - "matchesSubitoCategory usato catch-all semantics"
    - "usato label rename (Other/Altro/其他)"
  affects:
    - lib/listings/subito-categories.ts
    - messages/subito-category-labels.ts
    - lib/admin/subito-regalo-catalog.ts
tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN for filter-matcher branch logic"
key-files:
  created: []
  modified:
    - messages/subito-category-labels.ts
    - lib/admin/subito-regalo-catalog.ts
    - lib/listings/subito-categories.ts
    - lib/listings/subito-categories.test.ts
decisions:
  - "usato chip renamed to Other/Altro (zh '其他' already correct from a prior session, left untouched)"
  - "matchesSubitoCategory('usato') now returns true when resolved is 'usato' OR null, making the chip the true unresolved-catch-all filter"
metrics:
  duration: 8min
  completed: 2026-08-11
---

# Phase quick-260811-hta Plan 01: Rename Subito catch-all category label Summary

Renamed the Subito `usato` catch-all category label from "All categories" / "Tutte le categorie" (zh `其他` was already correct) to "Other" / "Altro" / "其他", and fixed `matchesSubitoCategory` so selecting that chip returns both listings literally tagged `usato` and listings whose canonical category could not be resolved (`resolved === null`), instead of only the former.

## What Was Built

**Task 1 — Label rename:**
- `messages/subito-category-labels.ts`: `subitoCategoriesIt.usato` → `'Altro'`, `subitoCategoriesEn.usato` → `'Other'`, `subitoCategoriesZh.usato` left as `'其他'` (verified already correct).
- `lib/admin/subito-regalo-catalog.ts`: `SUBITO_REGALO_CATALOG` `usato` entry's `labelIt` → `'Altro'`, keeping the `CATALOG_LABEL_BY_SLUG` fallback in `lib/listings/subito-categories.ts` consistent with the it locale message.

**Task 2 — Match-semantics fix (TDD):**
- `lib/listings/subito-categories.ts`: `matchesSubitoCategory` now special-cases `selected === 'usato'` to return `resolved === 'usato' || resolved === null`, with an explanatory comment above the branch. Every other `selected` value keeps the existing strict `resolved === selected` equality check. `resolveCanonicalCategorySlug` itself was not modified.
- `lib/listings/subito-categories.test.ts`: added three new cases inside the existing `describe('matchesSubitoCategory', ...)` block:
  1. Unresolved listing (`title: 'quaderno vuoto'`, `category: null`) matches `'usato'` → `true`.
  2. Listing resolving to a specific category (`title: 'sedia da ufficio'`, `category: null`, infers to `arredamento-casalinghi`) does not match `'usato'` → `false`.
  3. Regression: DB-tagged `category: 'usato'` listing still matches `'usato'` → `true`.

Followed RED → GREEN: tests were added and run first (1 new failure, all 5 pre-existing `matchesSubitoCategory` tests plus all others green), then the implementation fix was made and tests re-run to confirm all green.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```
npx vitest run lib/listings/subito-categories.test.ts lib/listings/canonical-categories.test.ts
```

Result: 2 test files passed, 26/26 tests passed (14 in `subito-categories.test.ts`, 12 in `canonical-categories.test.ts`, unmodified and unchanged pass count, confirming `resolveCanonicalCategorySlug` behavior is untouched).

Manual grep confirmed no other file still references `'Tutte le categorie'` or `'All categories'` for the `usato` slug (the one remaining `'Tutte le categorie'` hit in `messages/it.ts` is an unrelated `emptyDescription` string, not the `usato` label).

## Self-Check: PASSED

- FOUND: messages/subito-category-labels.ts (usato: 'Altro' / 'Other' / '其他' confirmed via grep)
- FOUND: lib/admin/subito-regalo-catalog.ts (usato labelIt: 'Altro' confirmed via grep)
- FOUND: lib/listings/subito-categories.ts (usato branch present)
- FOUND: lib/listings/subito-categories.test.ts (3 new usato test cases present)
- FOUND commit 8f362a5: feat(quick-260811-hta): rename usato catch-all label to Other/Altro
- FOUND commit d377c73: test(quick-260811-hta): add failing tests for usato catch-all matching
- FOUND commit 8eb81d2: feat(quick-260811-hta): treat usato as unresolved-catch-all in matchesSubitoCategory
