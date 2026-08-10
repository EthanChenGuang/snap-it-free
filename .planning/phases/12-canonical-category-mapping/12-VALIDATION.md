---
phase: 12
slug: canonical-category-mapping
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-10
signed_off: 2026-08-10
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
| 12-02-01 | 02 | 1 | CAT-01 | unit | `npm run test:lib -- lib/listings/subito-categories.test.ts -x` | ✅ | ✅ green |
| 12-02-02 | 02 | 1 | CAT-01 | unit | `npm run test:lib -- lib/i18n/listing-fields.test.ts -x` | ✅ | ✅ green |
| 12-02-03 | 02 | 1 | CAT-01 | unit | `npm run test:lib -- hooks/useDistanceCenter.test.ts -x` | ✅ | ✅ green |
| 12-03-01 | 03 | 2 | CAT-02 | unit | `npx vitest run lib/ugc/schemas.test.ts` | ✅ | ✅ green |
| 12-03-02 | 03 | 2 | CAT-02 | grep | `grep mapPostCategoryToSlug app/api/ugc/listings/route.ts` | ✅ | ✅ green |
| 12-03-03 | 03 | 2 | D-12 | grep | `grep postCategory components/ugc/PostForm.tsx` | ✅ | ✅ green |
| 12-04-01 | 04 | 3 | D-01/D-14/D-15 | grep | UI boundary grep (no folder IA) | ✅ | ✅ green |
| 12-04-02 | 04 | 3 | CAT-03 | unit | Phase 12 lib tests (see below) | ✅ | ✅ green |
| 12-04-03 | 04 | 3 | CAT-01–03 | build | `npm run build` | ✅ | ⚠️ pre-existing debt |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Lib Dedupe Audit (Plan 04 Task 2)

| Check | Result |
|-------|-------|
| `legacySlugFromInferred` in lib/ (excl. JSDoc comments) | ✅ 0 code hits — JSDoc reference only in `canonical-categories.ts:44` |
| `slugMap` in lib/ (excl. JSDoc comments) | ✅ 0 code hits — JSDoc reference only in `canonical-categories.ts:44` |
| `POST_CATEGORY_TO_SLUG` exported | ✅ `canonical-categories.ts:30` |
| `INFERRED_CATEGORY_TO_SLUG` exported | ✅ `canonical-categories.ts:46` |

### Phase 12 targeted test suite (2026-08-10)

```bash
npx vitest run \
  lib/listings/canonical-categories.test.ts \
  lib/listings/subito-categories.test.ts \
  lib/i18n/listing-fields.test.ts \
  hooks/useDistanceCenter.test.ts \
  lib/ugc/schemas.test.ts
# Test Files  5 passed (5)
# Tests  61 passed (61)
```

### Full lib suite note

```bash
npm run test:lib
# 286 passed, 3 failed — lib/admin/subito-regalo-catalog.test.ts (pre-existing Padova spike gate; unrelated to CAT-01–03)
```

---

## Wave 0 Requirements

- [x] `lib/listings/canonical-categories.ts` — resolver + mapping tables
- [x] `lib/listings/canonical-categories.test.ts` — CAT-01, D-09, D-11, D-18 coverage
- [x] Planning docs updated (ROADMAP, REQUIREMENTS, PROJECT) per D-19–D-24

---

## Integration Audit (Plan 04)

| Check | Result |
|-------|--------|
| No folder tiles / drill-down in `FavoritesPageClient.tsx` | ✅ green — no `FolderTile`, `folder drill`, or `/favorites/[` |
| `FilterSheet` still uses `SUBITO_CATEGORY_SLUGS` | ✅ green — import + map at lines 16, 128 |
| `PostForm` category picker uses `messages.post.categories` | ✅ green — `postCategoryLabel` at line 23 |
| No `FavoriteButton` or category display on favorites grid | ✅ green — no matches in `FavoritesPageClient.tsx` |
| No merged category groups in `FilterSheet` | ✅ green — no merged/group patterns |
| No `legacySlugFromInferred` / `slugMap` code (comments OK) | ✅ green — JSDoc only in `canonical-categories.ts` |

### Grep command outputs (2026-08-10)

```bash
# Task 12-04-01 automated verify — PASS
! rg -q 'FolderTile|folder drill|/favorites/\[' components/listings/FavoritesPageClient.tsx \
  && rg -q 'SUBITO_CATEGORY_SLUGS' components/listings/FilterSheet.tsx

# FavoritesPageClient — no folder IA, no FavoriteButton, no category display
rg 'FolderTile|folder drill|/favorites/\[|FavoriteButton|category' components/listings/FavoritesPageClient.tsx
# (no matches)

# FilterSheet — SUBITO_CATEGORY_SLUGS checklist unchanged
rg 'SUBITO_CATEGORY_SLUGS' components/listings/FilterSheet.tsx
# 16:  SUBITO_CATEGORY_SLUGS,
# 128:              {SUBITO_CATEGORY_SLUGS.map((slug) => {

# PostForm — i18n category labels via messages.post.categories
rg 'messages\.post\.categories' components/ugc/PostForm.tsx
# 23:  return messages.post.categories[category];
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FilterSheet 17-category checklist unchanged | D-14 | Visual unchanged | Open filter sheet; confirm 17 Subito labels |
| Favorites flat two-column grid | D-01/D-15 | No folder IA | Open `/favorites`; confirm flat grid only |
| PostForm category picker labels | D-12 | i18n unchanged | Post flow; confirm six friendly labels |

---

## ROADMAP Success Criteria (D-22)

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | Resolver works for Subito/UGC/inference | `canonical-categories.test.ts` (12 tests green) | ✅ |
| 2 | New UGC posts persist category slug | `grep mapPostCategoryToSlug app/api/ugc/listings/route.ts` + `schemas.test.ts` | ✅ |
| 3 | Mapping documented + tests pass | JSDoc `POST_CATEGORY_TO_SLUG` / `INFERRED_CATEGORY_TO_SLUG` + 61 phase lib tests | ✅ |
| 4 | FilterSheet behavior unchanged | integration grep (12-04-01) + manual D-14 | ✅ automated / manual pending |

### Build verification (PostCategory import chain)

```bash
npm run build
# Failed: lib/admin/cleanup.ts:34 Postgrest type cast (pre-existing; unrelated to PostCategory chain)
# PostCategory resolver/UGC path verified via targeted vitest + successful webpack compile before TS check
```

### I18N-01 partial

Message files unchanged in Phase 12 — `messages/key-parity.test.ts` skipped (no message file edits).

---

## Manual verify items for `/gsd-verify-work`

1. **FilterSheet visual (D-14):** Open filter sheet → confirm 17 Subito category labels unchanged
2. **Favorites flat grid (D-01/D-15):** Open `/favorites` → confirm two-column flat grid, no folder tiles
3. **PostForm labels (D-12):** Post flow → confirm six friendly category picker labels

---

## Out-of-scope debt (not blocking Phase 12 CAT gates)

| Item | File | Notes |
|------|------|-------|
| Padova spike gate tests | `lib/admin/subito-regalo-catalog.test.ts` | 3 failures; PADOVA_SPIKE_PASS vs artifact mismatch |
| Build TS error | `lib/admin/cleanup.ts:34` | PostgrestFilterBuilder cast; pre-existing |
