---
status: complete
completed: 2026-08-10
---

# Waterfall Feed Polish — Summary

## Completed

- Removed 72px bottom spacer; BottomNav rendered outside flex shell
- Feed scroll extends full height with safe-area padding; content scrolls under floating nav
- Floating capsule: `bg-white/70 backdrop-blur-md border-white/20 shadow-lg`, `z-50`, `bottom-4`
- Icons unified at 22px / `wght 300` outline across header and bottom nav
- GRATIS badge: emerald translucent pill with backdrop blur
- Heart: glass circle with `backdrop-blur-md`, hover scale
- Grid `gap-3`; title `line-clamp-1 font-medium`; metadata `text-xs text-on-surface-variant`

## Files Changed

- `components/shell/AppChrome.tsx`
- `components/shell/BottomNav.tsx`
- `components/shell/FeedHeaderRow.tsx`
- `components/shell/CompactLocaleChip.tsx`
- `components/listings/FeedHomeClient.tsx`
- `components/listings/ListListingCard.tsx`
- `components/listings/FavoriteButton.tsx`
