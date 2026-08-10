---
status: complete
task: refine-feed-list-page-header-filtering-p
completed: 2026-08-10
---

# Quick Task: Feed header pills & badge indicators

## Summary

Refined feed header filter pill bar and split badge indicators between the filter icon and map pin.

## Changes

1. **Removed location pills from top pill bar** — City (e.g. 帕多瓦), radius (e.g. 10公里内), and browse-center pills no longer render in `FeedActiveFilterPills`. Only search query and category pills remain.

2. **Filter icon black dot** — `computeHasActiveFilters` now covers general filter-sheet conditions: selected category or city mode (`city !== 'all'`). Map/radius mode no longer triggers the filter icon badge.

3. **Map pin red dot** — Added `bg-error` badge on the pin_drop link when `applied.mode === 'map'` and `shoumanwu_browse_center` exists (via `useBrowseCenter()`).

## Files

- `components/shell/FeedHeaderRow.tsx`
- `components/shell/FeedFilterContext.tsx`
