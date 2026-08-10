---
phase: 09-feed-first-home-navigation-ia
reviewed: 2026-08-09T12:08:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - app/layout.tsx
  - app/list/page.tsx
  - app/page.tsx
  - app/select-location/page.tsx
  - components/listings/FavoritesPageClient.tsx
  - components/listings/FeedHomeClient.tsx
  - components/map/SelectLocationClient.tsx
  - components/map/ZoneFilterChips.tsx
  - components/settings/GeneralSection.tsx
  - components/shell/AppChrome.tsx
  - components/shell/BottomNav.tsx
  - components/shell/CompactLocaleChip.tsx
  - components/shell/FeedHeaderRow.tsx
  - components/shell/FeedScrollContext.tsx
  - components/shell/Header.tsx
  - components/shell/NavMenuDrawer.tsx
  - components/shell/SimpleTitleBar.tsx
  - lib/browse-center/context.tsx
  - lib/browse-center/storage.ts
  - lib/browse-center/storage.test.ts
  - lib/listings/client-queries.ts
  - lib/listings/feed-search.ts
  - lib/listings/feed-search.test.ts
  - lib/listings/queries.ts
  - lib/listings/queries.test.ts
  - lib/listings/types.ts
  - messages/en.ts
  - messages/it.ts
  - messages/zh.ts
  - supabase/migrations/021_listings_public_description.sql
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-08-09T12:08:00Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Phase 9 delivers feed-first navigation (4-tab shell, HOME-02 header, select-location flow, favorites/settings chrome) across four plans. Core patterns (browse-center validation, feed search matcher, scroll-away header, route-conditional chrome) are sound and mirror existing favorites/preferences storage conventions.

Two **critical** issues center on `/select-location`: the route omits the plan-mandated `dynamic(..., { ssr: false })` wrapper used elsewhere for MapLibre, and `SelectLocationClient` reads `localStorage` during render — together these risk hydration mismatch and missing loading UX. Three **warnings** cover auth-gate timing on the Post tab, duplicate headings on Settings, and authenticated favorites falling back to stale local IDs on API failure.

## Critical Issues

### CR-01: Select-location page missing dynamic import and loading fallback

**File:** `app/select-location/page.tsx:1-5`
**Issue:** Plan 09-03 requires `dynamic` import of `SelectLocationClient` with `ssr: false` and a `post.mapLoading` fallback (must_have truth + acceptance criteria). The page statically imports the map client, unlike `MapHomeClient.tsx` which correctly wraps MapLibre behind `dynamic`. MapLibre + `readBrowseCenter()` during render will execute on the server pass; users also get no loading label while the map chunk loads.
**Fix:**
```tsx
import dynamic from 'next/dynamic';
import { getMessages } from '@/messages';

const mapLoadingLabel = getMessages('zh').post.mapLoading;

const SelectLocationClient = dynamic(
  () =>
    import('@/components/map/SelectLocationClient').then((mod) => mod.SelectLocationClient),
  {
    ssr: false,
    loading: () => (
      <main className="flex h-full w-full items-center justify-center bg-background">
        <p className="text-label-sm text-on-surface-variant">{mapLoadingLabel}</p>
      </main>
    ),
  },
);

export default function SelectLocationPage() {
  return <SelectLocationClient />;
}
```

### CR-02: Browse center read during render causes hydration mismatch

**File:** `components/map/SelectLocationClient.tsx:31-34,97-100`
**Issue:** `readBrowseCenter()` runs on every render. SSR returns `null` (no `window`), so the server emits `DEFAULT_CENTER` in `initialViewState`. On the client, a saved browse center can differ immediately, producing different map coordinates than the server HTML. React hydration warnings and a visible map jump are likely for returning users.
**Fix:** Initialize map from `DEFAULT_CENTER` only; hydrate saved center after mount:
```tsx
const [center, setCenter] = useState(DEFAULT_CENTER);
const [mapReady, setMapReady] = useState(false);

useEffect(() => {
  const saved = readBrowseCenter();
  if (saved) {
    setCenter(saved);
    mapRef.current?.jumpTo({ center: [saved.lng, saved.lat], zoom: 12 });
  }
  setMapReady(true);
}, []);

// initialViewState always uses DEFAULT_CENTER; gate Map render on mapReady if needed
```
Implementing CR-01 (`ssr: false`) eliminates the server/client split but the post-mount hydration pattern is still recommended for correctness if SSR is re-enabled later.

## Warnings

### WR-01: Post tab auth gate bypassed while session is loading

**File:** `components/shell/BottomNav.tsx:51-59`
**Issue:** `handleNavClick` returns early without `preventDefault` when `loading` is true. A logged-out user can tap Post before `useAuthSession` resolves and navigate to `/post`, bypassing the intended `AuthPromptModal` gate (D-18).
**Fix:**
```tsx
if (!item.authGate) return;
if (loading) {
  event.preventDefault();
  return;
}
if (user) return;
event.preventDefault();
setAuthOpen(true);
```

### WR-02: Duplicate h1 headings on Settings route

**File:** `components/shell/SimpleTitleBar.tsx:6` and `components/settings/SettingsPageClient.tsx:21`
**Issue:** `AppChrome` renders `SimpleTitleBar` with `<h1>{messages.app.title}</h1>` on `/settings`, while `SettingsPageClient` renders a second `<h1>{messages.settings.title}</h1>`. Favorites correctly removed its in-page h1 in plan 04; Settings now has two top-level headings, hurting accessibility and diverging from the favorites pattern established in the same phase.
**Fix:** Change the in-page heading to `<h2>` (or remove the title block from `SettingsPageClient` if the title bar is the sole page title per D-45).

### WR-03: Authenticated favorites fetch failure falls back to localStorage

**File:** `components/listings/FavoritesPageClient.tsx:19-27`
**Issue:** When `isAuthed` is true but `/api/favorites` returns non-OK (500, 401 after token expiry, network error), `fetchFavoriteIds` silently falls through to `readFavoriteIds()`. A signed-in user can see stale or device-local favorites instead of server state, with no error indication (E5 backstop applies only inside `loadFavorites`'s listing fetch catch).
**Fix:**
```tsx
async function fetchFavoriteIds(isAuthed: boolean): Promise<string[]> {
  if (isAuthed) {
    const response = await fetch('/api/favorites');
    if (response.ok) {
      const data = (await response.json()) as { listingIds?: string[] };
      return data.listingIds ?? [];
    }
    return []; // or throw/retry — do not fall back to local when authed
  }
  return readFavoriteIds();
}
```

## Info

### IN-01: Server page logs fetch errors to console in production path

**File:** `app/page.tsx:11-12`
**Issue:** `console.error` in the feed home server component will emit to production logs on transient Supabase failures. Not a functional bug, but inconsistent with client-side patterns that swallow transient errors quietly.
**Fix:** Remove or gate behind `process.env.NODE_ENV === 'development'`, or use structured server logging if available.

### IN-02: Favorites grid order ignores user's favorite sequence

**File:** `components/listings/FavoritesPageClient.tsx:47` via `lib/listings/client-queries.ts:41-42`
**Issue:** `fetchListingsByIdsClient` orders results by `posted_at DESC`, not by the order of IDs returned from `/api/favorites` or localStorage. Recently favorited items may appear in unexpected positions.
**Fix:** Re-sort `rows` to match the `ids` array order after fetch.

---

_Reviewed: 2026-08-09T12:08:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
