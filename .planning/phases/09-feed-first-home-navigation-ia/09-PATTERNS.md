# Phase 9: Feed-First Home & Navigation IA - Pattern Map

**Mapped:** 2026-08-09
**Files analyzed:** 29 new/modified files
**Analogs found:** 25 / 29

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/page.tsx` | route | request-response | `app/list/page.tsx` | exact |
| `app/list/page.tsx` | route | redirect | `app/post/manage/page.tsx` | role-match |
| `app/select-location/page.tsx` | route | request-response | `app/page.tsx` + `MapHomeClient` | exact |
| `app/layout.tsx` | config | provider mount | `app/layout.tsx` (existing) | exact |
| `components/shell/AppChrome.tsx` | provider | route-conditional | `components/shell/AppChrome.tsx` | exact |
| `components/shell/BottomNav.tsx` | component | event-driven | `components/shell/BottomNav.tsx` | exact |
| `components/shell/FeedHeaderRow.tsx` | component | event-driven | `ListPageClient` search + `Header.tsx` chrome | role-match |
| `components/shell/CompactLocaleChip.tsx` | component | event-driven | `HeaderLanguageDropdown.tsx` | exact |
| `components/shell/SimpleTitleBar.tsx` | component | static | `DetailTopBar.tsx` (sticky bar shell) | partial |
| `components/shell/FeedScrollContext.tsx` (implied) | provider | event-driven | `lib/ui/map-search-ui.ts` | partial |
| `components/listings/FeedHomeClient.tsx` | component | transform | `ListPageClient.tsx` | exact |
| `components/listings/FavoritesPageClient.tsx` | component | CRUD | `ListPageClient.tsx` + self | role-match |
| `components/listings/ListListingCard.tsx` | component | — | self (reuse as-is) | exact |
| `components/map/SelectLocationClient.tsx` | component | file-I/O | `MapHomeClient` + `ListingMap` | partial |
| `components/map/ZoneFilterChips.tsx` | component | transform | self (extend) | exact |
| `components/map/LocateMeButton.tsx` | component | — | self (reuse) | exact |
| `components/settings/GeneralSection.tsx` | component | static | `NavMenuDrawer.tsx` manage link | partial |
| `lib/browse-center/storage.ts` | utility | file-I/O | `lib/favorites/storage.ts` + `lib/settings/preferences.ts` | exact |
| `lib/browse-center/context.tsx` | provider | pub-sub | `lib/settings/preferences.ts` subscribe pattern | exact |
| `lib/listings/feed-search.ts` | utility | transform | `ListPageClient` filter + `listing-fields.ts` | exact |
| `lib/listings/queries.ts` | service | CRUD | self (extend columns) | exact |
| `lib/listings/client-queries.ts` | service | CRUD | self (extend columns) | exact |
| `messages/{zh,en,it}.ts` | config | static | existing `nav.*` / `list.*` keys | exact |
| `messages/index.ts` | config | static | self | exact |
| `lib/browse-center/storage.test.ts` | test | batch | `lib/favorites/storage.test.ts` | exact |
| `lib/listings/feed-search.test.ts` | test | transform | `lib/listings/filters.test.ts` | role-match |
| `supabase/migrations/*_description.sql` | migration | CRUD | no public-view migration analog | no analog |
| `next.config.ts` | config | redirect | RESEARCH.md only | no analog |
| `lib/ui/map-search-ui.ts` | utility | — | delete (retire with Header) | N/A |

---

## Pattern Assignments

### `app/page.tsx` (route, request-response)

**Analog:** `app/list/page.tsx`

**Imports pattern** (lines 1-3):

```typescript
import { ListPageClient } from '@/components/listings/ListPageClient';
import { getActiveListings } from '@/lib/listings/queries';
```

**Server fetch + graceful degrade** (lines 4-14):

```typescript
export const dynamic = 'force-dynamic';

export default async function ListPage() {
  let listings: Awaited<ReturnType<typeof getActiveListings>> = [];
  try {
    listings = await getActiveListings();
  } catch (error) {
    console.error('Failed to load listings for list page:', error);
  }
  return <ListPageClient initialListings={listings} />;
}
```

**Phase 9 change:** Swap `ListPageClient` → `FeedHomeClient`; update log message string. Keep `dynamic = 'force-dynamic'` and try/catch empty-array fallback.

---

### `app/list/page.tsx` (route, redirect)

**Analog:** `app/post/manage/page.tsx` (redirect import); RESEARCH.md for `permanentRedirect`

**Redirect pattern** (lines 1, 14-16 from `app/post/manage/page.tsx`):

```typescript
import { redirect } from 'next/navigation';
// ...
if (!user) {
  redirect('/post');
}
```

**Phase 9 target** (from RESEARCH.md — use `permanentRedirect` for 308):

```typescript
import { permanentRedirect } from 'next/navigation';

export default function ListPage() {
  permanentRedirect('/');
}
```

No `dynamic` export needed; page body never renders.

---

### `app/select-location/page.tsx` (route, request-response)

**Analog:** `app/page.tsx` + `components/map/MapHomeClient.tsx`

**Dynamic map import pattern** (`MapHomeClient.tsx` lines 1-20):

```typescript
'use client';

import '@/lib/map/maplibreWorker';
import dynamic from 'next/dynamic';
import { getMessages } from '@/messages';

const mapLoadingLabel = getMessages('zh').post.mapLoading;

const MapExplorer = dynamic(
  () => import('@/components/map/MapExplorer').then((mod) => mod.MapExplorer),
  {
    ssr: false,
    loading: () => (
      <main className="map-container relative flex w-full items-center justify-center overflow-hidden bg-surface-container-low">
        <p className="text-label-sm text-on-surface-variant">{mapLoadingLabel}</p>
      </main>
    ),
  },
);
```

**Phase 9:** Create thin server page (no listings fetch); dynamic-import `SelectLocationClient` with same `ssr: false` + `maplibreWorker` side-effect + loading fallback using `post.mapLoading`.

---

### `app/layout.tsx` (config, provider mount)

**Analog:** existing `app/layout.tsx`

**Provider nesting** (lines 46-58):

```typescript
<AppThemeProvider>
  <DocumentLang />
  <AppSerwistProvider>
    <FavoritesMergeProvider>
      <PwaOnboardingProvider>
        <AppChrome>
          {children}
        </AppChrome>
        <Toaster />
      </PwaOnboardingProvider>
    </FavoritesMergeProvider>
  </AppSerwistProvider>
</AppThemeProvider>
```

**Phase 9:** Insert `BrowseCenterProvider` alongside `FavoritesMergeProvider` (inside theme, wrapping chrome). Update metadata title from `"Map Explorer"` to feed-appropriate string using `defaultMessages.app.title`.

---

### `components/shell/AppChrome.tsx` (provider, route-conditional)

**Analog:** self (extend existing guards)

**Route-conditional chrome** (lines 8-27):

```typescript
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isListingDetail = pathname.startsWith('/listing/');

  if (isAdmin) {
    return (
      <div className="app-shell">
        <div className="app-main">{children}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!isListingDetail && <Header />}
      <div className="app-main">{children}</div>
      <BottomNav />
    </div>
  );
}
```

**Phase 9 extension pattern:**

```typescript
const showFeedHeader = pathname === '/';
const showSimpleTitleBar = pathname === '/favorites' || pathname === '/settings';
const showBottomNav =
  !pathname.startsWith('/listing/') && pathname !== '/select-location';
// Render FeedHeaderRow | SimpleTitleBar | nothing; conditionally render BottomNav
```

Remove global `<Header />` import; never render `NavMenuDrawer`.

---

### `components/shell/BottomNav.tsx` (component, event-driven)

**Analog:** self

**Nav items + active state** (lines 20-59):

```typescript
const navItems = [
  { href: '/', icon: 'map', label: messages.nav.map },
  { href: '/list', icon: 'format_list_bulleted', label: messages.nav.list },
  { href: '/post', icon: 'add_box', label: messages.nav.post },
  { href: '/settings', icon: 'settings', label: messages.nav.settings, showBadge: true },
] as const;

const isActive =
  item.href === '/'
    ? pathname === '/'
    : item.href === '/list'
      ? pathname === '/list'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

<span
  className="material-symbols-outlined text-[20px]"
  style={{
    fontVariationSettings: "'FILL' 0, 'wght' 400",
  }}
>
  {item.icon}
</span>
```

**Phase 9 changes:**
- Replace navItems with Home (`grid_view`, `/`), Post (`add_box`, auth gate), Favorites (`favorite`, `/favorites`), Settings (`settings`, badge).
- Toggle FILL: `isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400"`.
- Post tab: `onClick` with `preventDefault` when `!user` → `AuthPromptModal` (`redirectTo="/post"`). Pattern from `FavoriteButton.tsx` lines 49-60.
- Keep dynamic `UnreadMatchBadge` import (lines 11-14) — do not bare-import Supabase into layout chunk.
- Return `null` when `pathname === '/select-location'`.

---

### `components/shell/FeedHeaderRow.tsx` (component, event-driven)

**Analog:** `ListPageClient.tsx` search input + `Header.tsx` chrome classes

**Search input styling** (`ListPageClient.tsx` lines 49-60):

```typescript
<input
  type="search"
  value={searchQuery}
  onChange={(event) => setSearchQuery(event.target.value)}
  placeholder={messages.list.searchPlaceholder}
  aria-label={messages.header.search}
  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-4 text-body-md text-on-surface transition-all placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
/>
```

**Header chrome shell** (`Header.tsx` lines 51-52):

```typescript
<header className="relative z-[100] isolate w-full shrink-0 border-b border-outline-variant bg-surface">
  <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-space-md">
```

**Filter stub toast** (`FavoriteButton.tsx` lines 7, 59):

```typescript
import { toast } from '@/components/ui/toaster';
// ...
toast(added ? messages.favorites.added : messages.favorites.removed);
// Phase 9: toast(messages.feed.filterComingSoon);
```

**Phase 9 row layout:** `[CompactLocaleChip] [search flex-1] [filter btn tune] [location btn my_location → Link /select-location]`. Consume `FeedScrollContext` for `-translate-y-full opacity-0 transition-transform` when hidden. Lift search query via context shared with `FeedHomeClient`.

---

### `components/shell/CompactLocaleChip.tsx` (component, event-driven)

**Analog:** `HeaderLanguageDropdown.tsx`

**Radix dropdown + setAppLanguage** (lines 3-7, 14-48):

```typescript
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LANGUAGES } from '@/lib/i18n/languages';
import { setAppLanguage } from '@/lib/user/locale-client';

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <button
      type="button"
      className="flex min-h-11 min-w-11 touch-manipulation cursor-pointer items-center justify-center ..."
      aria-label={messages.header.language}
    >
      <span>{current.label}</span>
    </button>
  </DropdownMenu.Trigger>
  {/* ... */}
  <DropdownMenu.Item onSelect={() => setAppLanguage(entry.id)}>
    {entry.label}
  </DropdownMenu.Item>
</DropdownMenu.Root>
```

**Phase 9:** Show compact chip labels `中` / `EN` / `IT` (map from `LANGUAGES` or hardcode per UI-SPEC). Restyle trigger as pill: `bg-surface-container border border-outline-variant text-label-sm font-semibold`. Dynamic-import like `Header.tsx` lines 24-30 to avoid layout chunk bloat.

---

### `components/shell/SimpleTitleBar.tsx` (component, static)

**Analog:** `DetailTopBar.tsx` sticky bar shell (lines 46-47)

```typescript
<nav className="sticky top-0 z-40 border-b border-outline-variant bg-surface">
  <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-space-md">
```

**Phase 9:** Centered single title only — `text-h3 font-semibold text-on-surface`. Props: `title: string`. Used for favorites page title and settings app title (`messages.app.title`). No back button, no action icons.

---

### `components/shell/FeedScrollContext.tsx` (provider, event-driven)

**Analog:** `lib/ui/map-search-ui.ts` (cross-component state bridge)

**Subscribe + useSyncExternalStore pattern** (lines 29-42):

```typescript
export function subscribeMapSearch(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useMapSearchOpen(): boolean {
  const open = useSyncExternalStore(
    subscribeMapSearch,
    getMapSearchOpen,
    () => false,
  );
  // ...
}
```

**Phase 9:** React context preferred (scroll ref lives in `FeedHomeClient`). Provider wraps feed route content; `registerScrollContainer(ref)` attaches listener with ~8px direction threshold; `FeedHeaderRow` reads `headerHidden` boolean. Alternative: module-level store mirroring `map-search-ui.ts` if context nesting is awkward in `AppChrome`.

---

### `components/listings/FeedHomeClient.tsx` (component, transform)

**Analog:** `ListPageClient.tsx`

**Imports + poll + reported IDs** (lines 1-33):

```typescript
import { useEffect, useMemo, useState } from 'react';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { excludeReportedIds } from '@/lib/listings/filters';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

const { listings, isRefreshing } = useListingsPoll(initialListings);
```

**Filter logic** (lines 35-44 — replace with `matchesFeedSearch`):

```typescript
const filteredListings = useMemo(() => {
  const visible = excludeReportedIds(listings, reportedIds);
  const query = searchQuery.trim().toLowerCase();
  return visible.filter((listing) => {
    if (!query) return true;
    return listing.title.toLowerCase().includes(query);
  });
}, [listings, reportedIds, searchQuery]);
```

**Scroll container + empty state** (lines 68-91):

```typescript
<div className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-space-lg">
  {filteredListings.length === 0 && isRefreshing ? (
    <div className="flex items-center justify-center p-space-xl text-label-sm text-on-surface-variant">
      {messages.list.refreshing}
    </div>
  ) : filteredListings.length === 0 ? (
    <div className="border border-outline-variant bg-surface-container-lowest p-space-xl text-center">
      <span className="material-symbols-outlined mb-space-sm text-4xl text-on-surface-variant">
        inventory_2
      </span>
      {/* title + description */}
    </div>
  ) : (
    <section className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
```

**Phase 9 changes:**
- Drop inline search UI and `SubitoCategoryFilterChips` — search state from `FeedHeaderRow` context.
- Grid: `grid grid-cols-2 gap-space-md` (mobile default, D-38/D-40).
- Empty keys: `feed.emptyTitle` / `feed.emptySearchTitle` per UI-SPEC.
- Register scroll ref with `FeedScrollContext`.
- Main shell: `flex h-full flex-col overflow-hidden bg-background`; add bottom nav clearance `pb-space-xl`.

---

### `components/listings/FavoritesPageClient.tsx` (component, CRUD)

**Analog:** self + `ListPageClient` grid/empty patterns

**Auth gate + load pattern** (lines 64-102):

```typescript
useEffect(() => {
  const supabase = createClient();
  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthed(Boolean(session));
    await loadFavorites(authed);
  };
  void init();
  // FAVORITES_CHANGE_EVENT + onAuthStateChange listeners
}, [loadFavorites]);
```

**Empty CTA** (lines 162-167 — update href and key):

```typescript
<Link
  href="/"
  className="rounded border border-primary bg-primary px-space-md py-space-sm ..."
>
  {messages.favorites.browseMap}
</Link>
```

**Phase 9 changes:**
- Remove in-page `<h1>` header (moves to `SimpleTitleBar` in AppChrome).
- Remove `ZoneFilterChips` block (lines 187-189).
- Replace `ListingFeed` with 2-col `ListListingCard` grid + `FavoriteButton` on cards.
- CTA: `messages.feed.browseFeed`, link to `/`.
- Keep `AuthPromptModal` pattern unchanged.

---

### `components/map/SelectLocationClient.tsx` (component, file-I/O)

**Analog:** `MapHomeClient` + `ListingMap` (map setup only — no pins/sheet)

**MapLibre worker + Map ref** (`ListingMap.tsx` lines 3-6, 78):

```typescript
import '@/lib/map/maplibreWorker';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapRef = useRef<MapRef>(null);
const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';
```

**LocateMe** (`ListingMap.tsx` — reuse component):

```typescript
import { LocateMeButton } from './LocateMeButton';
// <LocateMeButton /> inside <Map>
```

**Zone chips** (`ZoneFilterChips.tsx` lines 16-37):

```typescript
<div className={cn('flex gap-space-sm overflow-x-auto no-scrollbar py-space-xs', className)}>
  {ZONE_CHIPS.map((zone) => (
    <Button variant={isActive ? 'chipActive' : 'chip'} size="sm" onClick={() => onZoneChange(zone)}>
      {zoneLabel(zone)}
    </Button>
  ))}
</div>
```

**Phase 9 — fixed center pin (new, no analog):**

```typescript
const onMoveEnd = useCallback(() => {
  const map = mapRef.current?.getMap();
  if (!map) return;
  const { lat, lng } = map.getCenter();
  setCenter({ lat, lng });
}, []);
```

Overlay: `absolute inset-0 pointer-events-none flex items-center justify-center` with pin SVG. No `Drawer`, no `ListingMap` pins. Confirm bar: primary black button → `writeBrowseCenter(center)` + `router.push('/')`. Back chevron: `router.push('/')`. Extend zone chips with Padova — flyTo using Padova fixture coords from `filters.test.ts` (`lat: 45.41, lng: 11.88`).

---

### `lib/browse-center/storage.ts` (utility, file-I/O)

**Analog:** `lib/favorites/storage.ts` + `lib/settings/preferences.ts`

**Simple read/write + event** (`favorites/storage.ts` lines 1-25):

```typescript
export const FAVORITES_STORAGE_KEY = 'shoumanwu_favorites';
export const FAVORITES_CHANGE_EVENT = 'shoumanwu-favorites-change';

export function readFavoriteIds(): string[] {
  if (typeof window === 'undefined') return [];
  return parseFavoriteIds(localStorage.getItem(FAVORITES_STORAGE_KEY));
}

export function writeFavoriteIds(ids: string[]): string[] {
  if (typeof window === 'undefined') return ids;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: ids }));
  return ids;
}
```

**Parse with bounds validation** (`preferences.ts` lines 32-47):

```typescript
function parsePreferences(raw: string | null): AppPreferences {
  if (!raw?.trim()) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return { /* validated fields */ };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
```

**Phase 9:** Key `shoumanwu_browse_center`; shape `{ lat: number; lng: number; label?: string }`; validate lat/lng finite and in valid ranges on read; `subscribeBrowseCenter` mirrors `subscribeAppPreferences` (lines 138-147).

---

### `lib/browse-center/context.tsx` (provider, pub-sub)

**Analog:** `components/providers/AppThemeProvider.tsx` + `lib/settings/preferences.ts`

**useSyncExternalStore consumer** (`AppThemeProvider.tsx` lines 18-22):

```typescript
const preferences = useSyncExternalStore(
  subscribeAppPreferences,
  readAppPreferences,
  () => DEFAULT_PREFERENCES,
);
```

**Phase 9:** Export `BrowseCenterProvider`, `useBrowseCenter()`, `writeBrowseCenter()` wrapper. Server snapshot returns `null` or default Venice center. Mount in `app/layout.tsx`.

---

### `lib/listings/feed-search.ts` (utility, transform)

**Analog:** `ListPageClient` filter + `lib/i18n/listing-fields.ts`

**Locale-aware field resolution** (`listing-fields.ts` lines 30-57):

```typescript
export function resolveListingTitle(row: ListingFieldRow, locale: AppLanguage): string { /* ... */ }

export function resolveListingDescription(
  row: ListingFieldRow,
  locale: AppLanguage,
): string | null { /* ... */ }
```

**Location label** (from `ListListingCard.tsx` lines 14-25):

```typescript
function listingLocationLabel(listing, zoneLabel): string {
  if (listing.zone) return zoneLabel(listing.zone);
  if (listing.city) return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  return '';
}
```

**Pure matcher signature** (from RESEARCH.md):

```typescript
export function matchesFeedSearch(
  listing: ListingRow,
  query: string,
  locale: AppLanguage,
  zoneLabel: (z: VeniceZone) => string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = resolveListingTitle(listing, locale).toLowerCase();
  const location = listingLocationLabel(listing, zoneLabel).toLowerCase();
  const description = (resolveListingDescription(listing, locale) ?? '').toLowerCase();
  return title.includes(q) || location.includes(q) || description.includes(q);
}
```

---

### `lib/listings/queries.ts` + `client-queries.ts` (service, CRUD)

**Analog:** self

**Column select constant** (`queries.ts` lines 8-9):

```typescript
const ACTIVE_LISTING_COLUMNS =
  'id, source, title, title_en, title_zh, photo_url, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';
```

**Phase 9 (conditional):** Append `description, description_en, description_zh` after migration exposes them on `listings_public`. Mirror change in `client-queries.ts` `ACTIVE_LISTING_COLUMNS`.

---

### `messages/{zh,en,it}.ts` (config, static)

**Analog:** existing `nav` and `list` namespaces (`messages/en.ts` lines 8-44)

```typescript
nav: {
  map: 'Map',
  list: 'List',
  post: 'Post',
  settings: 'Settings',
},
list: {
  searchPlaceholder: 'Search free items near you…',
  emptyTitle: 'No listings match your filters',
  // ...
},
```

**Phase 9:** Add `nav.home`, `nav.favorites`; add `feed.*` and `selectLocation.*` keys from `09-UI-SPEC.md` Copywriting Contract. Keep `nav.map`/`nav.list` until cleanup. Type shape in `messages/it.ts` (source of truth for `Messages` type).

---

### `components/settings/GeneralSection.tsx` (component, static)

**Analog:** `NavMenuDrawer.tsx` manage-post link (line 28)

```typescript
{ href: '/post/manage', icon: 'inventory_2', label: messages.post.manageLink },
```

**Phase 9:** Add `Link` to `/post/manage` in GeneralSection (or new row in SettingsUi card) using `messages.post.manageLink`. No drawer dependency.

---

### `lib/browse-center/storage.test.ts` (test, batch)

**Analog:** `lib/favorites/storage.test.ts`

**Test structure** (lines 1-30):

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { FAVORITES_STORAGE_KEY, readFavoriteIds, toggleFavoriteId } from './storage';

describe('readFavoriteIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty', () => {
    expect(readFavoriteIds()).toEqual([]);
  });

  it('returns empty array when JSON is corrupt', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not-json');
    expect(readFavoriteIds()).toEqual([]);
  });
});
```

**Phase 9:** Test round-trip write/read, invalid JSON, out-of-range lat/lng rejection, SSR guard (`typeof window === 'undefined'`).

---

### `lib/listings/feed-search.test.ts` (test, transform)

**Analog:** `lib/listings/filters.test.ts`

**Fixture listing** (lines 5-17):

```typescript
const baseListing: ListingRow = {
  id: '11111111-1111-1111-1111-111111111111',
  source: 'subito',
  title: 'Lampada gratis',
  // ...
  zone: 'centro_storico',
};
```

**Phase 9:** Cases for title match, location label match, description match (locale fallbacks), empty query returns true, no-match returns false.

---

## Shared Patterns

### Route-conditional shell (AppChrome)

**Source:** `components/shell/AppChrome.tsx`
**Apply to:** All shell components (`FeedHeaderRow`, `SimpleTitleBar`, `BottomNav`)

```typescript
const pathname = usePathname();
const isAdmin = pathname.startsWith('/admin');
const isListingDetail = pathname.startsWith('/listing/');
const isSelectLocation = pathname === '/select-location';
```

Admin: no chrome. Listing detail: no header/nav. Select-location: no feed header, no bottom nav.

---

### Dynamic import for heavy client modules

**Source:** `components/shell/Header.tsx` lines 19-30, `BottomNav.tsx` lines 11-14

**Apply to:** `CompactLocaleChip`, `UnreadMatchBadge`, map clients, auth modals in BottomNav

```typescript
const HeaderLanguageDropdown = dynamic(
  () => import('@/components/shell/HeaderLanguageDropdown').then((mod) => mod.HeaderLanguageDropdown),
  { ssr: false },
);
```

Prevents 2 MiB layout chunk truncation in dev.

---

### localStorage + CustomEvent sync

**Source:** `lib/settings/preferences.ts` lines 100-114, 138-147

**Apply to:** `lib/browse-center/storage.ts`, optional cross-tab sync

```typescript
localStorage.setItem(KEY, JSON.stringify(next));
window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));

export function subscribeBrowseCenter(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => { /* remove listeners */ };
}
```

---

### Auth gate before navigation

**Source:** `components/listings/FavoriteButton.tsx` lines 49-60, 87-92

**Apply to:** BottomNav Post tab

```typescript
const handleClick = async (event: React.MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (hasSession === false) {
    setAuthOpen(true);
    return;
  }
  // proceed with navigation or action
};

<AuthPromptModal
  open={authOpen}
  onOpenChange={setAuthOpen}
  redirectTo="/post"
  modalTitle={messages.auth.postTitle /* or existing key */}
/>
```

Prefer `useAuthSession()` over ad-hoc getSession in BottomNav.

---

### Toast notifications

**Source:** `components/ui/toaster.tsx` (via `FavoriteButton.tsx`)

**Apply to:** Filter stub in `FeedHeaderRow`

```typescript
import { toast } from '@/components/ui/toaster';
toast(messages.feed.filterComingSoon);
```

---

### i18n message access

**Source:** `lib/i18n/useMessages.ts` (used throughout shell)

**Apply to:** All new UI components

```typescript
const { messages, language, zoneLabel } = useMessages();
```

Add keys to all three locale files; `messages/key-parity.test.ts` gates parity.

---

### Stitch layout tokens

**Source:** `ListPageClient`, `Header`, `BottomNav`

**Apply to:** All new chrome

- `max-w-container-max mx-auto px-gutter`
- `border-outline-variant`, `bg-surface`
- `gap-space-md`, `py-space-md`
- Icon buttons: `min-h-11 min-w-11`
- No drop shadows on cards/panels (border-only empty states)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/list/page.tsx` (`permanentRedirect`) | route | redirect | Only `redirect()` used today (`app/post/manage/page.tsx`); no 308 permanent redirect in codebase — follow RESEARCH.md Next.js 16 API |
| `components/map/SelectLocationClient.tsx` (fixed center pin) | component | file-I/O | `PinMap` draggable marker and `ListingMap` browse pins differ; fixed overlay pin is new UX — compose from `ListingMap` canvas setup only |
| `components/shell/FeedScrollContext.tsx` | provider | event-driven | No scroll-hide header exists; closest is `map-search-ui.ts` pub-sub — new context bridging AppChrome ↔ page scroller |
| `supabase/migrations/*_description.sql` | migration | CRUD | No prior migration in repo exposing description to public view; planner follows Supabase migration conventions |

---

## Metadata

**Analog search scope:** `app/`, `components/shell/`, `components/listings/`, `components/map/`, `components/settings/`, `components/providers/`, `lib/browse-center/` (planned), `lib/favorites/`, `lib/settings/`, `lib/listings/`, `lib/i18n/`, `messages/`
**Files scanned:** ~45 source files
**Pattern extraction date:** 2026-08-09
