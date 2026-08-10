---
status: complete
completed: 2026-08-10
---

# Feed UI Polish — Summary

## Completed

- Header filter icon: `category_search`
- Header location icon: `pin_drop` (red `text-error` preserved)
- Search placeholder shortened: en `Search items…`, it `Cerca oggetti…`, zh `搜索物品…`
- Bottom nav post icon: `add_a_photo`
- Floating capsule: `fixed`, centered, `bg-white/80 backdrop-blur-md shadow-lg rounded-full`
- Scroll-to-hide: reuses `headerHidden` from `FeedScrollContext` on `/` via `useFeedScrollOptional()`
- Feed grid bottom padding increased (`pb-24`) for nav clearance

## Files Changed

- `components/shell/FeedHeaderRow.tsx`
- `components/shell/BottomNav.tsx`
- `components/shell/FeedScrollContext.tsx`
- `components/listings/FeedHomeClient.tsx`
- `messages/en.ts`, `messages/it.ts`, `messages/zh.ts`
