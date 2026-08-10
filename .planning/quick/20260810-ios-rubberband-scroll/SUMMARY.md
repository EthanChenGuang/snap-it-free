---
status: complete
completed: 2026-08-10
---

# iOS Rubberband Scroll — Summary

## Completed

- Added `RubberbandScroll` component with native iOS overscroll via CSS and Motion spring fallback on non-Apple touch devices
- Spring config: `stiffness: 300`, `damping: 30`; max stretch 88px with resistance curve; returns to `y: 0` on release
- `.rubberband-scroll` CSS: `-webkit-overflow-scrolling: touch`, `translateZ(0)`, `will-change: scroll-position`, `touch-action: pan-y`
- Wired into feed (`FeedHomeClient`) and favorites (`FavoritesPageClient` empty + grid states)
- Preserved `scrollRef` registration for feed header scroll-hide behavior

## Note

`overscroll-behavior-y: bounce` is not a valid CSS keyword; `auto` preserves native Safari rubberband. Framer Motion fallback covers Android/desktop PWA where native bounce is limited.

## Files Changed

- `components/ui/RubberbandScroll.tsx` (new)
- `app/globals.css`
- `components/listings/FeedHomeClient.tsx`
- `components/listings/FavoritesPageClient.tsx`
