---
status: complete
date: 2026-08-11
slug: post-image-persistence
---

# Fix image loss when returning from the location picker

Photos added on `/post` disappeared after visiting `/select-location` and coming back.
A previous attempt (260811-post-media-refine) added a `draftHydrated` gate, but the bug
persisted, so this pass reproduced it in a browser before changing anything.

## Reproduction (browser, dev server)

1. `/post`, upload 2 photos → `sessionStorage.shoumanwu_post_draft` holds 2 `photoDataUrls`
2. Tap the pickup-location row → draft still holds 2 photos on `/select-location`
3. Return to `/post` → **`photoDataUrls` still 2, but 0 `<img>` in the DOM**

The write path was fine. The restore path was the failure.

## Root causes

1. **Restore was a fragile async race.** Rehydration went through
   `dataUrlsToPhotoFiles` → `setPhotos` inside a promise guarded by a `cancelled`
   flag. Any effect re-run discarded the result, and the generic auto-persist
   effect then observed `photos: []` and wrote `photoDataUrls: []` back — turning a
   transient restore miss into permanent data loss.
2. **Every photo was re-encoded on every keystroke.** The persist effect depended on
   `photos`, so each title/description change re-encoded the full photo set to base64.
3. **`sessionStorage` quota (~5 MB measured) was never handled.** `setItem` had no
   try/catch, so real camera photos (base64 inflates ~33%) threw `QuotaExceededError`
   out of `mergePostDraft` — which was awaited before `router.push`, blocking navigation.
4. **`MAX_DRAFT_PHOTO_BYTES = 3 MB` silently dropped real photos**, since typical phone
   photos exceed it.
5. **`revokeObjectURL` cleanup keyed on `[photos]`** revoked previews of surviving
   photos whenever the array changed, breaking already-rendered images.

## Approach

- Carry the original `File[]` in module state (`lib/post-draft/photo-cache.ts`). It
  survives `router.push` within the document, so the common round-trip restores
  synchronously and losslessly, with no async gap and no re-encode.
- Keep a downscaled JPEG copy in `sessionStorage` purely as the hard-reload fallback.
- Persist photos only on explicit user actions (add/remove), never from an effect that
  can observe an empty array.

## Tasks

1. Add `lib/post-draft/photo-cache.ts` module-level `File[]` handoff
2. Add `compressPhotoForDraft` (canvas, max 1280 px, q 0.72) with a raw fallback
3. Make `persistDraft` quota-safe by shedding trailing photos instead of throwing
4. Rework `PostForm` hydration, persistence split, and blob URL lifecycle
5. Cover new behaviour with unit tests; verify end-to-end in a browser
