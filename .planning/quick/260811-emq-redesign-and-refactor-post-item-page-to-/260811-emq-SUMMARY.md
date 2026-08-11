---
status: complete
quick_id: 260811-emq
---

# Quick Task Summary: Post Item Page iOS Redesign

## Completed

- Replaced single 16:9 photo crop with horizontal snap carousel (`object-contain`, 288×288 tiles, 1/N badge, delete control, add-more card)
- Multi-select upload (up to 10 images); submit still uses first photo for existing single-photo API
- Title + description grouped in inset iOS-style focus card with auto-expanding textarea
- Category `<select>` replaced with 3-column chip grid matching condition chips
- Fixed frosted bottom bar with full-width pill submit and `active:scale-[0.98]` micro-animation
- i18n keys: `addMorePhotos`, `removePhoto` (en/zh/it)

## Files

- `components/ugc/PostForm.tsx` — main redesign
- `components/ugc/PostPageClient.tsx` — layout spacing
- `messages/en.ts`, `messages/zh.ts`, `messages/it.ts` — new strings

## Notes

Backend listing API remains single-photo; additional carousel images are UI-only until multi-photo upload is supported.
