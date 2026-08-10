# Quick Task: iOS Rubberband Scroll

Add iOS-style smooth rubberband overscroll/bounce to Product List (`FeedHomeClient`) and Favorites List (`FavoritesPageClient`).

## Tasks

1. **RubberbandScroll** — Reusable scroll wrapper with CSS touch overscroll + Motion spring fallback (stiffness 300, damping 30) on non-iOS
2. **globals.css** — `.rubberband-scroll` utility (`-webkit-overflow-scrolling: touch`, GPU layer, `overscroll-behavior-y: auto`)
3. **FeedHomeClient** — Replace inner scroll `div` with `RubberbandScroll` (preserve `scrollRef` for feed scroll context)
4. **FavoritesPageClient** — Wrap empty + grid scroll regions with `RubberbandScroll`
