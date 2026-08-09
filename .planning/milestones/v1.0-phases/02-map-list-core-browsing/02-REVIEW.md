---
status: clean
phase: 02-map-list-core-browsing
reviewed: 2026-07-28T21:32:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - app/favorites/page.tsx
  - app/globals.css
  - app/layout.tsx
  - app/list/page.tsx
  - app/listing/[id]/page.tsx
  - app/page.tsx
  - app/post/page.tsx
  - app/settings/page.tsx
  - components/detail/DetailTopBar.tsx
  - components/detail/HeroMetadata.tsx
  - components/detail/ScrapedListingShell.tsx
  - components/listings/FavoriteButton.tsx
  - components/listings/FavoritesPageClient.tsx
  - components/listings/ListPageClient.tsx
  - components/listings/ListingCard.tsx
  - components/listings/ListingFeed.tsx
  - components/listings/ListingPopup.tsx
  - components/map/ListingMap.tsx
  - components/map/LocateMeButton.tsx
  - components/map/MapExplorer.tsx
  - components/map/ZoneFilterChips.tsx
  - components/shell/BottomNav.tsx
  - components/shell/Header.tsx
  - components/ui/button.tsx
  - components/ui/drawer.tsx
  - components/ui/toast.tsx
  - components/ui/toaster.tsx
  - lib/favorites/storage.test.ts
  - lib/favorites/storage.ts
  - lib/favorites/useFavorites.ts
  - lib/listings/client-queries.ts
  - lib/listings/external-url.test.ts
  - lib/listings/external-url.ts
  - lib/listings/filters.ts
  - lib/listings/queries.test.ts
  - lib/listings/queries.ts
  - lib/listings/share.ts
  - lib/listings/useListingsPoll.ts
  - lib/supabase/client.ts
  - lib/supabase/env.ts
  - lib/supabase/server.ts
  - lib/utils.ts
  - messages/it.ts
  - supabase/migrations/004_listings_public_read_rls.sql
  - supabase/migrations/005_expire_listings_cron.sql
critical: 0
warning: 6
info: 4
total: 10
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-28T21:32:00Z
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

Phase 2 delivers a coherent map/list/favorites browse stack with solid favorites hydration fixes, external URL allowlisting, and UUID validation on detail routes. No critical security or data-loss defects were found in the reviewed application code. The main concerns are a **BottomNav route-prefix bug** that mis-highlights the List tab on listing detail pages, **misleading favorites empty state on fetch failure**, and **RLS granting anon SELECT on sensitive columns** (`raw_payload`) beyond what the UI queries.

## Warnings

### WR-01: BottomNav marks List tab active on `/listing/*` routes

**File:** `components/shell/BottomNav.tsx:21`
**Issue:** Active detection uses `pathname.startsWith(item.href)`. Because `/listing/[id]` starts with `/list`, the Elenco tab appears active on listing detail pages.
**Fix:**
```tsx
const isActive =
  item.href === '/'
    ? pathname === '/'
    : item.href === '/list'
      ? pathname === '/list'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
```

### WR-02: Favorites page shows “no favorites” when Supabase fetch fails

**File:** `components/listings/FavoritesPageClient.tsx:30-32`
**Issue:** The `catch` block sets `listings` to `[]`, which renders the empty-state UI (“Nessun preferito”) even when `localStorage` still holds favorite IDs. The comment says localStorage is preserved, but the UI contradicts that.
**Fix:** Track a separate `error`/`fetchFailed` flag and render a retry/error panel when `readFavoriteIds().length > 0` but fetch failed, instead of the empty-state branch.

### WR-03: `embedBlocked` not reset when navigating between listings

**File:** `components/detail/ScrapedListingShell.tsx:22-33`
**Issue:** When `listing.external_url` changes (client navigation between detail pages), the effect schedules a new timeout but never resets `embedBlocked` to `false`. A listing viewed after an earlier one skips the iframe attempt entirely.
**Fix:** Reset at the top of the effect:
```tsx
useEffect(() => {
  if (!canOpenExternal) {
    setEmbedBlocked(true);
    return;
  }
  setEmbedBlocked(false);
  const timer = window.setTimeout(() => setEmbedBlocked(true), EMBED_TIMEOUT_MS);
  return () => window.clearTimeout(timer);
}, [canOpenExternal, listing.external_url]);
```

### WR-04: Unhandled Supabase query errors crash server pages

**File:** `app/page.tsx:7`, `app/list/page.tsx:7`, `app/listing/[id]/page.tsx:19`
**Issue:** `getActiveListings()` and `getListingById()` re-throw Supabase errors. Transient DB/network failures produce unhandled 500s instead of degraded empty/null responses (unlike client poll code, which keeps the last good snapshot).
**Fix:** Wrap server fetches in try/catch and return `[]` / `null`, or add a route-level `error.tsx` with Italian fallback copy.

### WR-05: RLS policy exposes full `listings` row to anon, including `raw_payload`

**File:** `supabase/migrations/004_listings_public_read_rls.sql:6-16`
**Issue:** `grant select on public.listings to anon` combined with a row policy allows direct PostgREST queries for all columns, including `raw_payload`, `content_hash`, and `external_id`. The app selects a safe column subset, but the API surface is wider than the UI contract.
**Fix:** Expose a `listings_public` view with only browse-safe columns and point RLS/grants at the view; keep base table restricted to service role.

### WR-06: Zone filter can yield empty feed without explanation on Favorites

**File:** `components/listings/FavoritesPageClient.tsx:48-92`
**Issue:** When `listings.length > 0` but `filteredListings.length === 0`, the header still shows the total saved count while the feed silently shows zero items in the selected zone.
**Fix:** Add a zone-specific empty message when `listings.length > 0 && filteredListings.length === 0`.

## Info

### IN-01: Hardcoded favorites change event string

**File:** `components/listings/FavoritesPageClient.tsx:44`
**Issue:** Listener uses literal `'shoumanwu-favorites-change'` instead of `FAVORITES_CHANGE_EVENT` from `lib/favorites/storage.ts`, creating drift risk if the constant changes.
**Fix:** Import and use `FAVORITES_CHANGE_EVENT`.

### IN-02: Header menu button is a non-functional stub

**File:** `components/shell/Header.tsx:15-21`
**Issue:** Menu button has no `onClick` or navigation behavior; it appears interactive but does nothing.
**Fix:** Wire to a drawer/sheet or disable with `aria-disabled` until Phase 4 menu exists.

### IN-03: `pruneFavoriteIds` is unused outside tests

**File:** `lib/favorites/storage.ts:39`
**Issue:** Production code uses `pruneMissingFavoriteIds` only; `pruneFavoriteIds` remains exported but dead in the app layer.
**Fix:** Remove export or consolidate pruning helpers if no future caller is planned.

### IN-04: `isVeniceZone` exported but unused in browse UI

**File:** `lib/listings/filters.ts:15-17`
**Issue:** Type guard is exported but not referenced by any reviewed component; zone chips use a static array instead.
**Fix:** Use for runtime validation of URL/search params in a later phase, or remove until needed.

---

_Reviewed: 2026-07-28T21:32:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
