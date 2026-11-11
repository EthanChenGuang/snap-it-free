# PLAN — Phase 3: Locked feed search/filters

## Tasks

1. Pure `lockedTeaserForFilters(...)` over `composeFeedListings` + `teaserFromListings`. Tests: search, city, category change count and photos; empty rows with SSR fallback; unfiltered keeps SSR count; no titles/ids in the teaser.
2. Hook `useLockedFeedTeaser` reads optional feed filter + search contexts, fetches `fetchActiveListingsClient` when Supabase env exists, returns `{ count, photoUrls }`.
3. `LockedFeed` uses the hook; `data-testid=locked-count` on the count copy; photo URLs only in the grid.
4. drive.mjs (onboarding, after step 10): search input enabled; filter button opens the sheet (no paywall); no `/listing/` links; if a real count is present, a nonsense search changes the count, clearing it restores; favorites stay locked. Data-dependent asserts SKIP (never PASS) when the local feed is empty.

## Done when

- Non-subscriber can search/filter on `/` without a paywall on every tap.
- Count and blurred photos track real filtered rows.
- Detail and favorites remain locked.
