---
status: complete
date: 2026-08-11
slug: post-media-refine
---

# Post Media Refine — Summary

## Critical fix: image loss on location return

**Root cause**: `persistFormDraft` ran when `draftReady=true` but before async photo rehydration finished, writing `photoDataUrls: []` and wiping sessionStorage.

**Fix**:
- Added `draftHydrated` gate — auto-persist only after photo restore completes
- `persistDraftSnapshot()` always encodes all photos; used explicitly before `router.push('/select-location')`

## UI refinements

- **Category**: `usato` displays as 其他 / Other / Altro via `messages.post.categoryOther` (filter sheet unchanged)
- **Condition**: strict `grid-cols-5 gap-1.5` equal-width pills
- **Media**: iOS segmented toggle (carousel ↔ grid); carousel `h-64 w-64 object-contain`; grid `grid-cols-3 gap-2.5`

## Files

- `components/ugc/PostForm.tsx`
- `messages/en.ts`, `messages/zh.ts`, `messages/it.ts`
