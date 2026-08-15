---
status: complete
date: 2026-08-11
slug: post-form-redesign
---

# Post Form Redesign + Draft Fix — Summary

## Done

- **Image draft fix**: `lib/post-draft/storage.ts` now stores `photoDataUrls[]` (Base64). Legacy single `photoDataUrl` migrated on read. `PostForm` awaits `persistFormDraft()` before `router.push('/select-location')` and rehydrates all photos on mount.
- **17-category grid**: PostForm uses `SUBITO_CATEGORY_SLUGS` with Filter Sheet styling (`grid-cols-3 gap-2.5`) and clear-selection control.
- **5 condition grades**: `brand_new`, `like_new`, `good`, `fair`, `poor` with iOS pill tags; messages updated en/zh/it.
- **UI**: Multi-image horizontal carousel, inset grouped title/description card, fixed frosted submit bar (Stitch tokens).
- **API**: `CreateListingSchema` accepts Subito slugs directly; listings route stores slug without `mapPostCategoryToSlug`.

## Tests

- `lib/post-draft/storage.test.ts` — 18 passed
- `lib/ugc/schemas.test.ts` — 10 passed
- `tsc --noEmit` — clean

## Files

- `components/ugc/PostForm.tsx`
- `lib/post-draft/storage.ts`
- `lib/post-draft/storage.test.ts`
- `lib/ugc/schemas.ts`
- `lib/ugc/schemas.test.ts`
- `app/api/ugc/listings/route.ts`
- `messages/en.ts`, `messages/zh.ts`, `messages/it.ts`
