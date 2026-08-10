---
phase: 12-canonical-category-mapping
reviewed: 2026-08-10T18:44:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - lib/listings/canonical-categories.ts
  - lib/listings/subito-categories.ts
  - lib/i18n/listing-fields.ts
  - lib/ugc/schemas.ts
  - app/api/ugc/listings/route.ts
  - components/ugc/PostForm.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-08-10T18:44:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 12 introduces a coherent canonical category resolver (`resolveCanonicalCategorySlug`), consolidates filter and display paths through it, and wires the UGC write path to persist mapped Subito slugs via `postCategory` enum validation. The architecture is sound: server-side slug mapping prevents client tampering (V5), filter/display consumers delegate to a single resolver, and 49 phase-scoped unit tests pass.

No security vulnerabilities or data-loss paths were found in the reviewed files. Two warnings concern user-visible label correctness and a stale maintainer comment; two info items note minor type-safety and documentation drift.

## Warnings

### WR-01: UGC "others" posts display misleading catalog label

**File:** `lib/listings/canonical-categories.ts:52`, `lib/i18n/listing-fields.ts:72-81`
**Issue:** `mapPostCategoryToSlug('others')` correctly maps to the `usato` slug per D-11, but `resolveListingCategory` then calls `getSubitoCategoryLabel('usato', …)` which returns the Italian catalog label **"Tutte le categorie"** (all categories). Users who pick "Altro / Other" in PostForm will see that catch-all label on `ListingCard` category badges — semantically opposite of their selection.
**Fix:** Either map `others` to a slug whose catalog label matches the picker intent, or add a display override for UGC-sourced listings (e.g. pass `source: 'ugc'` into a label resolver that prefers `messages.post.categories.others` when slug is `usato` and category was user-selected).

### WR-02: Extra `category` field on create payload is silently stripped, not rejected

**File:** `lib/ugc/schemas.ts:8-15`
**Issue:** `CreateListingSchema` uses default Zod object parsing (strip unknown keys). A client sending `{ postCategory: 'furniture', category: 'informatica' }` passes validation; the tampered `category` slug is dropped and `furniture → arredamento-casalinghi` is persisted. Tampering cannot override the slug (secure), but the API returns 201 instead of 400, which weakens the V5 "reject raw slug" contract tested only for the missing-`postCategory` case.
**Fix:** Add `.strict()` to `CreateListingSchema` (and the extended user schema) so unexpected keys like `category` produce a 400 validation error:

```typescript
export const CreateListingSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    photoUrl: z.string().url(),
    lat: z.number().min(45.0).max(45.7),
    lng: z.number().min(12.1).max(12.6),
    description: z.string().max(2000).optional(),
    postCategory: postCategoryEnum,
  })
  .strict();
```

## Info

### IN-01: Stale PostCategory sync comment

**File:** `lib/listings/canonical-categories.ts:17`
**Issue:** Comment reads "keep in sync with components/ugc/PostForm.tsx" but PostForm now imports `PostCategory` and `POST_CATEGORIES` from this module — the dependency direction inverted in Plan 03.
**Fix:** Update comment to state PostForm and zod schema consume exports from this module (single source of truth).

### IN-02: `PostCategory` union manually duplicated from mapping table

**File:** `lib/listings/canonical-categories.ts:18-24`, `40`
**Issue:** `PostCategory` is a hand-written union while `POST_CATEGORIES` is derived from `Object.keys(POST_CATEGORY_TO_SLUG)`. TypeScript `Record<PostCategory, …>` catches key omissions today, but the pattern requires editing two places when adding a category.
**Fix:** Derive the type from the table: `type PostCategory = keyof typeof POST_CATEGORY_TO_SLUG` and export a const tuple for zod: `const POST_CATEGORIES = ['furniture', …] as const satisfies readonly PostCategory[]`.

---

_Reviewed: 2026-08-10T18:44:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
