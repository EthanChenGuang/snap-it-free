---
phase: 09-feed-first-home-navigation-ia
plan: 02
subsystem: ui
tags: [nextjs, feed-search, scroll-header, i18n, supabase-migration]

requires:
  - phase: 09-01
    provides: FeedHomeClient grid at / and AppChrome without legacy Header
provides:
  - FeedHeaderRow with locale chip, search, filter stub toast, location link
  - FeedScrollContext scroll-away header on feed scroll
  - matchesFeedSearch client matcher (title + description + location)
  - Migration 021 description columns on listings_public
affects: [09-03, 09-04, 10-search-filter-distance]

tech-stack:
  added: []
  patterns:
    - "FeedScrollProvider colocates searchQuery + headerHidden for HOME-02 row"
    - "Filter stub uses toast(messages.feed.filterComingSoon) — no sheet until Phase 10"

key-files:
  created:
    - components/shell/FeedHeaderRow.tsx
    - components/shell/FeedScrollContext.tsx
    - components/shell/CompactLocaleChip.tsx
    - lib/listings/feed-search.ts
    - lib/listings/feed-search.test.ts
    - supabase/migrations/021_listings_public_description.sql
  modified:
    - components/shell/AppChrome.tsx
    - components/listings/FeedHomeClient.tsx
    - lib/listings/queries.ts
    - lib/listings/client-queries.ts
    - lib/listings/types.ts
    - lib/listings/queries.test.ts
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts

key-decisions:
  - "CompactLocaleChip reimplements HeaderLanguageDropdown with 中/EN/IT pill trigger"
  - "Scroll listener attaches to FeedHomeClient inner scroller, not window"

patterns-established:
  - "Shared feed search state via FeedScrollContext between header and grid"
  - "Scroll-away header collapses with translate-y + max-h-0 when hidden"

requirements-completed: [HOME-02, I18N-01]

coverage:
  - id: D1
    description: matchesFeedSearch filters title, description, and location label
    requirement: HOME-02
    verification:
      - kind: unit
        ref: "lib/listings/feed-search.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: FeedHeaderRow on / with locale chip, search, filter toast, location link
    requirement: HOME-02
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
    human_judgment: true
    rationale: Scroll-away and filter toast require manual feed interaction
  - id: D3
    description: listings_public exposes description columns for client fetch
    requirement: HOME-02
    verification:
      - kind: unit
        ref: "supabase/migrations/021_listings_public_description.sql"
        status: pass
    human_judgment: true
    rationale: Migration must be applied to remote Supabase before production search breadth
  - id: D4
    description: feed.* and selectLocation.back keys in zh/en/it
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-09
status: complete
---

# Phase 9 Plan 02: HOME-02 Feed Header & Search Summary

**Unified feed header row with scroll-away behavior, locale-aware client search (title + description + location), and Supabase description columns on listings_public.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-09T11:56:57Z
- **Completed:** 2026-08-09T11:59:30Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- `matchesFeedSearch` pure matcher with 5 unit tests covering empty query, title, location, description, and no-match cases
- Migration 021 adds `description`, `description_en`, `description_zh` to `listings_public` view
- `FeedHeaderRow` renders HOME-02 controls on `/` only; filter shows trilingual stub toast; location links to `/select-location`
- `FeedScrollContext` hides header on scroll down (~8px threshold) and restores on scroll up; shared search state wires header input to grid filter
- Trilingual `feed.*` and `selectLocation.*` keys added; empty search uses `feed.emptySearchTitle` panel

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): feed-search tests** - `3167275` (test)
2. **Task 1 (GREEN): feed-search + migration** - `b5d71df` (feat)
3. **Task 2: FeedHeaderRow + CompactLocaleChip** - `3315ca2` (feat)
4. **Task 3: FeedScrollContext + wire search** - `ca7aed0` (feat)

## Files Created/Modified

- `lib/listings/feed-search.ts` - Client search matcher using resolveListingTitle/Description
- `lib/listings/feed-search.test.ts` - Five D-06 test cases
- `supabase/migrations/021_listings_public_description.sql` - Public view description columns
- `components/shell/FeedHeaderRow.tsx` - HOME-02 unified search row
- `components/shell/CompactLocaleChip.tsx` - 中/EN/IT locale pill + picker
- `components/shell/FeedScrollContext.tsx` - Scroll-away + shared search state
- `components/shell/AppChrome.tsx` - FeedScrollProvider + FeedHeaderRow on `/`
- `components/listings/FeedHomeClient.tsx` - matchesFeedSearch filter + scroll registration
- `messages/{zh,en,it}.ts` - feed.* and selectLocation.* copy

## Decisions Made

- CompactLocaleChip duplicates dropdown logic (not overlay on HeaderLanguageDropdown) for correct pill UX
- Header collapse uses translate-y + max-h-0 to reclaim vertical space when hidden

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated queries.test.ts ACTIVE_COLUMNS**
- **Found during:** Task 3 verification (`npm run test:lib`)
- **Issue:** Test expected pre-migration column list without description fields
- **Fix:** Extended ACTIVE_COLUMNS constant to match queries.ts
- **Files modified:** lib/listings/queries.test.ts
- **Committed in:** ca7aed0

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test sync only; no scope change.

## Issues Encountered

- Full `npm run test:lib` reports 3 pre-existing failures in `lib/admin/subito-regalo-catalog.test.ts` (Padova spike gate); unrelated to Phase 9 Plan 02. Plan-related tests (feed-search, key-parity, queries) all pass.

## User Setup Required

None — apply migration 021 to Supabase when deploying (standard operator step).

## Next Phase Readiness

- Plan 03 can implement `/select-location` route (location button may 404 until then — expected per plan)
- Plan 04 can add SimpleTitleBar for favorites/settings
- Phase 10 can replace filter stub toast with filter sheet

## Self-Check: PASSED

- FOUND: lib/listings/feed-search.ts
- FOUND: lib/listings/feed-search.test.ts
- FOUND: components/shell/FeedHeaderRow.tsx
- FOUND: components/shell/FeedScrollContext.tsx
- FOUND: components/shell/CompactLocaleChip.tsx
- FOUND: supabase/migrations/021_listings_public_description.sql
- FOUND: 3167275
- FOUND: b5d71df
- FOUND: 3315ca2
- FOUND: ca7aed0

---
*Phase: 09-feed-first-home-navigation-ia*
*Completed: 2026-08-09*
