# Quick Task: Feed UI Polish

Final UI/UX refactoring of Feed header icons, search placeholder, and floating bottom nav capsule with scroll-to-hide.

## Tasks

1. **FeedHeaderRow** — Replace filter icon `filter_list` → `category_search`, location `my_location` → `pin_drop`
2. **i18n** — Shorten `feed.searchPlaceholder` to compact variants (en/it/zh)
3. **BottomNav** — Post icon `add_box` → `add_a_photo`; floating capsule (`bg-white/80 backdrop-blur-md shadow-lg rounded-full`)
4. **FeedScrollContext** — Add `useFeedScrollOptional()` for scroll-hide on feed route
5. **BottomNav scroll-hide** — Slide off-screen on scroll down via shared `headerHidden` state
6. **FeedHomeClient** — Increase bottom padding for floating nav clearance
