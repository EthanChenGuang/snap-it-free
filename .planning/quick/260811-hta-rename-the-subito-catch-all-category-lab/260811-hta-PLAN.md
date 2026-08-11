---
phase: quick-260811-hta
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - messages/subito-category-labels.ts
  - lib/admin/subito-regalo-catalog.ts
  - lib/listings/subito-categories.ts
  - lib/listings/subito-categories.test.ts
autonomous: true
requirements: [QUICK-260811-HTA]

must_haves:
  truths:
    - "The 'usato' Subito category chip displays as 'Other' (en) / '其他' (zh) / 'Altro' (it) instead of 'All categories' / '全部分类' / 'Tutte le categorie'"
    - "Selecting the 'usato'/'Other' chip returns listings whose canonical category is 'usato' OR unresolved (null) — not just listings literally tagged 'usato'"
    - "All other category chips keep exact-match filtering semantics unchanged"
    - "resolveCanonicalCategorySlug's own return values are unchanged (fix lives only in the filter matcher)"
  artifacts:
    - messages/subito-category-labels.ts
    - lib/admin/subito-regalo-catalog.ts
    - lib/listings/subito-categories.ts
    - lib/listings/subito-categories.test.ts
  key_links:
    - "matchesSubitoCategory('usato' branch) -> resolveCanonicalCategorySlug(...) === 'usato' || === null"
    - "getSubitoCategoryLabel -> messages.feed.subitoCategories.usato -> subitoCategoriesIt/En/Zh.usato"
---

<objective>
Rename the Subito catch-all category label (slug `usato`) from "All categories" / "全部分类" / "Tutte le categorie" to "Other" / "其他" / "Altro" across the it/en/zh locale message maps (and the catalog fallback label), and fix `matchesSubitoCategory` so selecting this chip actually returns uncategorized (unresolved) listings in addition to listings literally tagged `usato`.

Purpose: The `usato` catch-all currently claims to mean "All categories" but only matches listings whose resolved canonical category is literally `usato` — items that fail all specific-category inference silently vanish from every filter, including this one. Renaming to "Other" and fixing the match semantics makes the chip's label and behavior consistent: it becomes the true "everything that doesn't fit a specific bucket" filter.

Output: Updated locale label maps, updated catalog fallback label, corrected `matchesSubitoCategory` filter logic with an explanatory comment, and unit tests proving the fix (plus a regression test proving `usato`-tagged listings still match, and that `resolveCanonicalCategorySlug` itself is untouched).
</objective>

<context>
@messages/subito-category-labels.ts
@lib/admin/subito-regalo-catalog.ts
@lib/listings/subito-categories.ts
@lib/listings/subito-categories.test.ts
@lib/listings/canonical-categories.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rename 'usato' catch-all label to Other/其他/Altro</name>
  <files>messages/subito-category-labels.ts, lib/admin/subito-regalo-catalog.ts</files>
  <action>
In `messages/subito-category-labels.ts`: change `subitoCategoriesIt.usato` from `'Tutte le categorie'` to `'Altro'`; change `subitoCategoriesEn.usato` from `'All categories'` to `'Other'`. Leave `subitoCategoriesZh.usato` exactly as-is (`'其他'`) — verify it reads `'其他'` and do not touch that line if already correct.

In `lib/admin/subito-regalo-catalog.ts`: change the `usato` entry's `labelIt` from `'Tutte le categorie'` to `'Altro'` in the `SUBITO_REGALO_CATALOG` array, so the `CATALOG_LABEL_BY_SLUG` fallback in `lib/listings/subito-categories.ts` stays consistent with the it locale message when the messages map is unavailable.

Do not touch any other slug's label in either file.
  </action>
  <verify>
    <automated>grep -n "usato" messages/subito-category-labels.ts lib/admin/subito-regalo-catalog.ts</automated>
  </verify>
  <done>subitoCategoriesIt.usato === 'Altro', subitoCategoriesEn.usato === 'Other', subitoCategoriesZh.usato === '其他' (unchanged), SUBITO_REGALO_CATALOG's usato.labelIt === 'Altro'.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fix matchesSubitoCategory to treat 'usato' as the unresolved-catch-all bucket</name>
  <files>lib/listings/subito-categories.ts, lib/listings/subito-categories.test.ts</files>
  <behavior>
    - Test: a listing with no DB category and a title matching no inference keyword (e.g. title "quaderno vuoto", category null) — `matchesSubitoCategory(listing, 'usato')` returns true (previously false, since `resolveCanonicalCategorySlug` returns null and null !== 'usato').
    - Test: a listing that resolves to a different specific category (title "sedia da ufficio", category null, which infers to `arredamento-casalinghi`) — `matchesSubitoCategory(listing, 'usato')` returns false.
    - Test (regression): a listing with DB `category: 'usato'` — `matchesSubitoCategory(listing, 'usato')` still returns true.
    - All existing tests in this file (informatica DB-slug match, 'all' passthrough, title-inference fallback, facebook-source null-category miss, bogus-slug fallback) continue to pass unmodified — none of them select `'usato'`, so the new branch does not affect them.
  </behavior>
  <action>
In `lib/listings/subito-categories.ts`, update `matchesSubitoCategory`: after computing `resolved`, special-case `selected === 'usato'` to return `resolved === 'usato' || resolved === null` — every other `selected` value keeps the existing strict `resolved === selected` equality check. Add a one-line comment directly above the `usato` branch explaining that `usato` is Subito's own catch-all category and doubles as the "everything that doesn't resolve to a specific bucket" filter, so unresolved listings (`resolved === null`) belong in it too — do not just restate what the code does.

Add the three new test cases described in `<behavior>` to the existing `describe('matchesSubitoCategory', ...)` block in `lib/listings/subito-categories.test.ts`, alongside the current cases (do not remove or alter existing tests).
  </action>
  <verify>
    <automated>npx vitest run lib/listings/subito-categories.test.ts lib/listings/canonical-categories.test.ts</automated>
  </verify>
  <done>All tests in both files pass; the three new `usato` cases (unresolved-matches, specific-category-does-not-match, DB-usato-still-matches) are present and green; `lib/listings/canonical-categories.test.ts` is unmodified and still passes, confirming `resolveCanonicalCategorySlug` behavior is untouched.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Listing data → filter matcher | `listing.category`/`listing.title` originate from scraped/UGC data and flow into `matchesSubitoCategory`; already validated upstream by `normalizeCatalogSlug` (rejects unknown slugs) before this change and unaffected by it. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260811hta-01 | Information Disclosure | `matchesSubitoCategory` (usato branch) | low | accept | Widening the `usato` match to include `null`-resolved listings only broadens what a user can already browse anonymously (public listing feed); no new data exposed beyond existing categories' own listings. |
| T-260811hta-02 | Tampering | Locale label maps (`messages/subito-category-labels.ts`) | low | accept | Static compile-time string constants, no runtime/user input path; TypeScript `satisfies Record<SubitoRegaloSlug, string>` guards against key drift. |

No package installs in this plan — package legitimacy gate not applicable.
</threat_model>

<verification>
Run `npx vitest run lib/listings/subito-categories.test.ts lib/listings/canonical-categories.test.ts` — both files pass with zero failures, and `canonical-categories.test.ts` output is byte-identical in pass/fail counts to its pre-change baseline (proving `resolveCanonicalCategorySlug` was not touched).

Manually confirm via grep that no other file still references the old `'Tutte le categorie'` / `'All categories'` strings for the `usato` slug (the zh string `'其他'` was already correct from a prior session and must remain unchanged).
</verification>

<success_criteria>
- [ ] `subitoCategoriesIt.usato === 'Altro'`, `subitoCategoriesEn.usato === 'Other'`, `subitoCategoriesZh.usato === '其他'`
- [ ] `SUBITO_REGALO_CATALOG` usato fallback `labelIt === 'Altro'`
- [ ] `matchesSubitoCategory(listing, 'usato')` returns true for both `resolved === 'usato'` and `resolved === null`
- [ ] `matchesSubitoCategory(listing, 'usato')` returns false when `resolved` is any other specific slug
- [ ] All other slugs' match semantics unchanged (existing non-usato tests still pass)
- [ ] `resolveCanonicalCategorySlug` unmodified; `canonical-categories.test.ts` passes unchanged
- [ ] New tests committed in `lib/listings/subito-categories.test.ts`
</success_criteria>

<output>
Create `.planning/quick/260811-hta-rename-the-subito-catch-all-category-lab/260811-hta-SUMMARY.md` when done
</output>
