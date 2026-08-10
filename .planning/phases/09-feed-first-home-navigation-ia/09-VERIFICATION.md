---
phase: 09-feed-first-home-navigation-ia
verified: 2026-08-10T15:08:00Z
status: passed
score: 18/18 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:

  - must_have: "Post (UGC) remains accessible via menu/drawer — not a primary bottom tab (NAV-02)"
    reason: "D-01 locked decision: four-tab bottom nav with Post as primary tab; documented in 09-01 checkpoint and SUMMARY"
    accepted_by: "phase-09-executor"
    accepted_at: "2026-08-09T00:00:00Z"
gaps: []
gap_resolved:

  - truth: "/select-location route compiles and serves the map picker (NAV-03 / roadmap SC #3)"
    resolved_at: "2026-08-09T12:15:00Z"
    fix: "43671e7 — SelectLocationPageClient wrapper with dynamic ssr:false; readBrowseCenter deferred to useEffect"

  - truth: "Post tab auth gate, scroll-away header, filter control, select-location Confirm flow"
    resolved_at: "2026-08-10T15:08:00Z"
    fix: "09-UAT.md autonomous Playwright run — scripts/phase9-uat-automation.mjs 7/7 pass"
behavior_unverified_items: []
human_verification: []

# Phase 9: Feed-First Home & Navigation IA Verification Report

**Phase Goal:** Grid feed becomes default home; four-tab bottom nav (Home · Post · Favorites · Settings); map demoted to select-location flow; unified feed header row.

**Verified:** 2026-08-09T12:08:00Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET `/` renders two-column listing grid (not map home) | ✓ VERIFIED | `app/page.tsx` → `FeedHomeClient`; grid `grid-cols-2 gap-space-md` in `FeedHomeClient.tsx` |
| 2 | GET `/list` permanent redirect to `/` | ✓ VERIFIED | `app/list/page.tsx` uses `permanentRedirect('/')` |
| 3 | Bottom nav shows four tabs Home · Post · Favorites · Settings | ✓ VERIFIED | `BottomNav.tsx` navItems: grid_view/, add_box/post, favorite/favorites, settings/settings |
| 4 | Active tab uses Material FILL 1 + bold text-primary | ✓ VERIFIED | `fontVariationSettings: "'FILL' 1"` + `font-bold text-primary` when `isActive` |
| 5 | Post tab auth gate for logged-out users | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `handleNavClick` + `AuthPromptModal redirectTo=/post` wired; no behavioral test |
| 6 | Feed grid uses useListingsPoll, newest-first, ListListingCard → detail | ✓ VERIFIED | `useListingsPoll` in FeedHomeClient; `queries.ts` `.order('posted_at', { ascending: false })`; card pushes `/listing/[id]` |
| 7 | Feed empty states (zero listings + search no-match) | ✓ VERIFIED | Bordered panel with `feed.emptyTitle` / `feed.emptySearchTitle` keys |
| 8 | HOME-02 feed header row on `/` only | ✓ VERIFIED | `AppChrome` renders `FeedHeaderRow` when `pathname === '/'`; locale chip + search + filter + location |
| 9 | Client search matches title + description + location | ✓ VERIFIED | `matchesFeedSearch` + 5 passing tests in `feed-search.test.ts`; migration 021 adds description columns |
| 10 | Filter button shows toast stub (no sheet) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `onClick={() => toast(messages.feed.filterComingSoon)}` present; toast display not tested |
| 11 | Header scroll-away on feed scroll | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `FeedScrollContext` + `registerScrollContainer` wired; no runtime scroll test |
| 12 | Location button links to `/select-location` | ✓ VERIFIED | `FeedHeaderRow` Link `href="/select-location"` with `my_location` icon |
| 13 | `/select-location` route compiles and serves map picker | ✗ FAILED | `npm run build` fails: `ssr: false` not allowed with `next/dynamic` in Server Component |
| 14 | Confirm persists browse center; no feed filtering in Phase 9 | ✓ VERIFIED (persist) / ✓ VERIFIED (no filter) | `writeBrowseCenter` on Confirm; 6 storage tests pass; FeedHomeClient does not read browse center |
| 15 | Minimal chrome on `/select-location` (no header/nav/active tab) | ✓ VERIFIED | `AppChrome` early return without header/nav; `BottomNav` returns null on `/select-location` |
| 16 | Favorites 2-col grid + SimpleTitleBar + auth gate | ✓ VERIFIED | `FavoritesPageClient` grid + `AuthPromptModal`; `SimpleTitleBar` on `/favorites` |
| 17 | Settings SimpleTitleBar + manage-posts link | ✓ VERIFIED | `AppChrome` SimpleTitleBar with `messages.app.title`; `GeneralSection` Link `/post/manage` |
| 18 | Phase 9 i18n keys in zh/en/it | ✓ VERIFIED | `messages/key-parity.test.ts` passes; feed.*, nav.home/favorites, selectLocation.* present |
| 19 | Admin routes omit bottom nav | ✓ VERIFIED | `AppChrome` admin branch renders children only, no BottomNav |
| 20 | SSR listing fetch failure → empty feed without crash | ✓ VERIFIED | `app/page.tsx` try/catch returns `FeedHomeClient` with `[]` |

**Score:** 13/18 truths verified (4 present, behavior-unverified; 1 failed)

**Override applied:** NAV-02 drawer-only Post superseded by D-01 four-tab nav (documented in 09-01-SUMMARY).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/listings/FeedHomeClient.tsx` | Feed grid client | ✓ VERIFIED | Substantive, wired from `app/page.tsx` |
| `app/page.tsx` | Feed home route | ✓ VERIFIED | getActiveListings → FeedHomeClient |
| `app/list/page.tsx` | Permanent redirect | ✓ VERIFIED | permanentRedirect('/') |
| `components/shell/BottomNav.tsx` | Four-tab nav | ✓ VERIFIED | Wired in AppChrome |
| `components/shell/AppChrome.tsx` | Route-conditional shell | ✓ VERIFIED | Feed header, SimpleTitleBar, admin bypass |
| `components/shell/FeedHeaderRow.tsx` | HOME-02 row | ✓ VERIFIED | Wired on `/` |
| `components/shell/FeedScrollContext.tsx` | Scroll-away bridge | ✓ VERIFIED | Provider wraps feed route |
| `components/shell/CompactLocaleChip.tsx` | Locale chip | ✓ VERIFIED | 中/EN/IT dropdown |
| `lib/listings/feed-search.ts` | Search matcher | ✓ VERIFIED | 5 unit tests pass |
| `supabase/migrations/021_listings_public_description.sql` | Description columns | ✓ VERIFIED | View includes description_* |
| `app/select-location/page.tsx` | Select-location route | ✗ STUB/BROKEN | Exists but breaks production build |
| `components/map/SelectLocationClient.tsx` | Map picker client | ✓ VERIFIED | MapLibre, fixed pin, zone chips, Confirm |
| `lib/browse-center/storage.ts` | Browse center persistence | ✓ VERIFIED | 6 tests pass |
| `lib/browse-center/context.tsx` | Provider | ✓ VERIFIED | Mounted in `app/layout.tsx` |
| `components/shell/SimpleTitleBar.tsx` | Secondary tab title | ✓ VERIFIED | Favorites + Settings |
| `components/listings/FavoritesPageClient.tsx` | Favorites grid | ✓ VERIFIED | 2-col grid, auth gate, empty CTA |
| `components/settings/GeneralSection.tsx` | Manage posts link | ✓ VERIFIED | Link to /post/manage |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/page.tsx` | `FeedHomeClient` | getActiveListings → initialListings | ✓ WIRED | Direct render |
| `BottomNav` Post tab | `AuthPromptModal` | onClick preventDefault when !user | ⚠️ PARTIAL | Wired; behavior unverified |
| `FeedHeaderRow` | `/select-location` | Link my_location | ✓ WIRED | href="/select-location" |
| `SelectLocationClient` Confirm | browse center + `/` | writeBrowseCenter + router.push | ✓ WIRED | Code present; route build broken |
| `AppChrome` | `FeedHeaderRow` / `BottomNav` | pathname guards | ✓ WIRED | Conditional render per route |
| `FeedScrollContext` | `FeedHeaderRow` + `FeedHomeClient` | shared searchQuery + scroll ref | ✓ WIRED | Provider wraps feed shell |
| `AppChrome` | `SimpleTitleBar` | /favorites, /settings | ✓ WIRED | Title props from messages |
| `GeneralSection` | `/post/manage` | Link manageLink | ✓ WIRED | SettingsCard row |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `FeedHomeClient` | `listings` | `getActiveListings()` SSR + `useListingsPoll` | Supabase `.from('listings_public').select(...).order('posted_at')` | ✓ FLOWING |
| `FeedHomeClient` | `filteredListings` | `matchesFeedSearch(listing, searchQuery, ...)` | Client filter on live listings | ✓ FLOWING |
| `FavoritesPageClient` | `listings` | `/api/favorites` or localStorage + `fetchListingsByIdsClient` | Supabase fetch by IDs | ✓ FLOWING |
| `SelectLocationClient` | `center` | map `onMoveEnd` + zone chips | MapLibre getCenter() | ✓ FLOWING (component level; page build fails) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Feed search matcher | `npx vitest run lib/listings/feed-search.test.ts` | 5/5 pass | ✓ PASS |
| Browse center storage | `npx vitest run lib/browse-center/storage.test.ts` | 6/6 pass | ✓ PASS |
| i18n key parity | `npx vitest run messages/key-parity.test.ts` | 3/3 pass | ✓ PASS |
| Production build | `npm run build` | Webpack error on select-location page | ✗ FAIL |
| No consumer /list links | `rg 'href="/list"' --glob '*.tsx'` | 0 matches outside redirect page | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared probes or `scripts/*/tests/probe-*.sh` for Phase 9.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| NAV-01 | 01, 04 | Bottom nav Home · Favorites · Settings (Stitch) | ✓ SATISFIED | Four-tab nav with Stitch tokens; D-01 adds Post tab |
| NAV-02 | 01 | Post via menu/drawer, not bottom tab | ✓ SATISFIED (override) | D-01 override: Post is bottom tab; checkpoint documented |
| NAV-03 | 03 | Map secondary via location button | ✗ BLOCKED | SelectLocationClient exists; route fails `npm run build` |
| NAV-04 | 01 | `/` shows grid feed home | ✓ SATISFIED | FeedHomeClient at `/` |
| HOME-01 | 01 | Two-column mobile grid | ✓ SATISFIED | grid-cols-2 + ListListingCard |
| HOME-02 | 02 | Unified search row (locale/search/filter/location) | ✓ SATISFIED | FeedHeaderRow with all four controls |
| HOME-03 | 01 | `/list` redirects to feed | ✓ SATISFIED | permanentRedirect |
| I18N-01 (partial) | 01–04 | Phase 9 strings in zh/en/it | ✓ SATISFIED | key-parity.test.ts pass; UI-SPEC copywriting keys present |

All eight requirement IDs declared across Phase 9 plans are accounted for. No orphaned Phase 9 requirement IDs found in REQUIREMENTS.md beyond those listed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX in phase-modified source files | — | Clean |

### Human Verification Required

1. **Feed grid at mobile width** — Open `/` at 375px; expect 2-col grid, not map.
2. **Post auth gate** — Logged out, tap Post; expect AuthPromptModal before navigation.
3. **Scroll-away header** — Scroll feed down/up; header hides/shows; bottom nav fixed.
4. **Filter toast** — Tap tune icon; trilingual toast in each locale.
5. **Favorites grid** — Logged in, 2-col cards with working heart toggle.
6. **Settings chrome** — Title bar 手慢无; manage-posts link to `/post/manage`.
7. **Select-location flow** — Blocked until build fix; then verify map + Confirm + localStorage.

### Gaps Summary

Phase 9 delivers the feed-first IA pivot in source: `/` is a wired two-column feed, four-tab bottom nav with D-01 Post override, HOME-02 header row, favorites/settings chrome, and browse-center persistence. **One blocker prevents goal completion:** `app/select-location/page.tsx` breaks `npm run build` because `next/dynamic` with `ssr: false` is used in a Server Component (Next.js 16 webpack error). Until fixed (typically a `'use client'` wrapper around the dynamic import), NAV-03 and roadmap success criterion #3 ("Location button opens `/select-location`") cannot ship.

Four behavior-dependent truths (Post auth gate, scroll-away header, filter toast, Confirm integration flow) are present and wired but lack behavioral tests — routed to human verification.

**Suggested fix for build gap:**

```tsx
// app/select-location/SelectLocationPageClient.tsx
'use client';
import dynamic from 'next/dynamic';
// ... dynamic(..., { ssr: false })
```

Then import that wrapper from a thin Server Component page.

---

_Verified: 2026-08-09T12:08:00Z_  
_Verifier: Claude (gsd-verifier)_
