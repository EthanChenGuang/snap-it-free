# SUMMARY — Phase 3: Locked feed search/filters

Shipped on `feat/onboarding-snag`.

## Current behaviour found

Header search + filter sheet were already rendered on `/` for locked users (`AppChrome` / `FeedHeaderRow`). `LockedFeed` ignored them and showed a static SSR teaser. Detail and favorites were already locked.

## What landed

- `lockedTeaserForFilters`: client-side `composeFeedListings` → count + photo URLs only. Empty rows keep the SSR teaser (no fake filtered count). Unfiltered keeps the SSR total.
- `useLockedFeedTeaser` + `LockedFeed` follow search/filters. `bodyFiltered` when filters are on so we never say "across all cities" for a filtered count.
- No `/listing/` links, titles or ids in the locked DOM. Photos stay `pointer-events-none`. Detail + favorites unchanged.

## Verification

- `locked-feed.test.ts` (9): search/city/category change count+photos; empty rows keep SSR; teaser has only count+urls.
- Local drive: search enabled PASS; typing does not open paywall PASS; filter sheet opens PASS; search-count SKIP (no local data); favorites SKIP on flag-off (page ignores `?onboarding=1` by design; persist/Preview cover flag-on).

## Not in this phase

Teaser migration 045 (category-filtered RPC). After 044, rows are empty for non-subscribers and the SSR teaser is kept honestly.
