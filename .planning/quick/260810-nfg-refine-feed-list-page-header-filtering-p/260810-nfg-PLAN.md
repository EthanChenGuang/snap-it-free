# Quick Task 260810-nfg: Feed header pills & badge indicators

## Tasks

### 1. Remove location pills from FeedActiveFilterPills
- **File:** `components/shell/FeedHeaderRow.tsx`
- Remove city, radius, and center (browse) pill rendering
- Keep search query and category pills only
- Clean up unused imports/helpers

### 2. Split filter vs map badge logic
- **File:** `components/shell/FeedFilterContext.tsx` — filter icon dot: category or city mode (not map mode)
- **File:** `components/shell/FeedHeaderRow.tsx` — map pin red dot when browse center exists and `applied.mode === 'map'`

### 3. Verify
- Run typecheck / relevant tests
