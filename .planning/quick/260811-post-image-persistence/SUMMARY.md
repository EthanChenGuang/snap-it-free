---
status: complete
date: 2026-08-11
slug: post-image-persistence
---

# Fix image loss on location return — Summary

## What changed

**New — `lib/post-draft/photo-cache.ts`**
Module-level `File[]` handoff. Survives `router.push` within the document, so
`/post → /select-location → /post` restores the original photos synchronously at full
resolution. `sessionStorage` is now only the hard-reload fallback.

**`lib/post-draft/storage.ts`**
- `compressPhotoForDraft` downscales to 1280 px / q 0.72 via canvas before encoding,
  with a raw-encode fallback where canvas is unavailable (SSR, jsdom)
- `persistDraft` catches `QuotaExceededError` and sheds trailing photos until the
  payload fits, instead of throwing out of `mergePostDraft`
- `MAX_DRAFT_PHOTO_BYTES` raised 3 MB → 8 MB (now only guards the uncompressed fallback)

**`components/ugc/PostForm.tsx`**
- Hydration reads the module cache first; the async `sessionStorage` decode is only a
  fallback, and no code path can write an empty photo list over a populated draft
- Text/category/condition/location persist without `photoDataUrls`, so `mergePostDraft`
  preserves stored photos — a keystroke can no longer wipe them, and typing no longer
  re-encodes every photo
- Photos persist only from `commitPhotos` (add/remove), sequenced by a write token so
  rapid edits cannot land out of order
- Blob URLs are revoked for the specific removed photo plus all photos on unmount,
  instead of on every `photos` change
- `handleOpenLocationPicker` navigates directly; no awaited encode gates navigation

## Verification

Production build (`next start`), Chromium, full user flow:

| Scenario | Result |
|---|---|
| Upload 2 photos → map → confirm → back | 3/3 preserved: photos, title, location |
| Hard reload after return | 2 photos restored from sessionStorage |
| Type in description | photos untouched, no re-encode |
| Delete one photo | survivor still decodes (`naturalWidth > 0`) |
| Add 2 more → second map round trip | all 3 preserved, all decode |
| 11 MB + 9.6 MB photos | compressed to 619 KB each, draft 1.2 MB total |
| Synthetic undecodable images over quota | degrades gracefully, no throw, no lost navigation |

Measured `sessionStorage` ceiling in Chromium: between 4 MB and 5 MB.

`npx tsc --noEmit` clean. `npm test` — 58 files, 354 tests passing, including 8 new:
4 in `lib/post-draft/photo-cache.test.ts`, 4 in `lib/post-draft/storage.test.ts`
covering quota degradation and photo-field isolation.

## Notes

- Within a session photos keep full resolution; after a browser reload they are
  restored at the 1280 px draft copy. Previously they were lost entirely.
- Unrelated pre-existing issues observed and left alone: `/manifest.webmanifest`
  returns 500 in dev, `/select-location` hits a Next.js client-reference-manifest
  invariant in dev only, and `PostForm`'s Supabase `getUser().then(setIsLoggedIn)`
  logs an unmounted-setState warning under StrictMode.

## Files

- `lib/post-draft/photo-cache.ts` (new)
- `lib/post-draft/photo-cache.test.ts` (new)
- `lib/post-draft/storage.ts`
- `lib/post-draft/storage.test.ts`
- `components/ugc/PostForm.tsx`
