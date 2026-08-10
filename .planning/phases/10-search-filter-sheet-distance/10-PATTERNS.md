# Phase 10: Search, Filter Sheet & Distance - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 24 new/modified files
**Analogs found:** 22 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/geo/haversine.ts` | utility | transform | `lib/geo/nearest-zone.ts` | role-match |
| `lib/geo/format-distance.ts` | utility | transform | `useMessages().formatRelativeTime` pattern | partial |
| `lib/geo/haversine.test.ts` | test | transform | `lib/listings/filters.test.ts` | role-match |
| `lib/geo/format-distance.test.ts` | test | transform | `lib/listings/filters.test.ts` | role-match |
| `lib/filter-prefs/storage.ts` | utility | file-I/O | `lib/browse-center/storage.ts` | exact |
| `lib/filter-prefs/storage.test.ts` | test | file-I/O | `lib/browse-center/storage.test.ts` | exact |
| `components/shell/FeedFilterContext.tsx` | provider | event-driven | `lib/browse-center/context.tsx` + `FeedScrollContext.tsx` | exact |
| `components/listings/FilterSheet.tsx` | component | event-driven | `components/settings/AlertCreateSheet.tsx` | exact |
| `hooks/useDistanceCenter.ts` (optional) | hook | request-response | `components/ugc/PostForm.tsx` geolocation | role-match |
| `components/shell/FeedHeaderRow.tsx` | component | event-driven | self + `FeedActiveFilterPills` | exact |
| `components/shell/FeedScrollContext.tsx` | provider | event-driven | self (remove category state) | exact |
| `components/listings/FeedHomeClient.tsx` | component | transform | self (extend pipeline) | exact |
| `components/listings/ListListingCard.tsx` | component | — | self (extend metadata line) | exact |
| `components/map/SelectLocationClient.tsx` | component | file-I/O | self (remove zone chips) | exact |
| `lib/listings/filters.ts` | utility | transform | self + `filterMapListings` | exact |
| `lib/listings/subito-categories.ts` | utility | transform | self (`matchesSubitoCategory`) | exact |
| `lib/browse-center/storage.ts` | utility | file-I/O | self (add `clearBrowseCenter`) | exact |
| `components/shell/AppChrome.tsx` | provider | route-conditional | self (add `FeedFilterProvider`) | exact |
| `lib/listings/feed-search.ts` | utility | transform | self (city-only location label) | exact |
| `messages/{zh,en,it}.ts` | config | static | existing `feed.*` keys | exact |
| `lib/browse-center/storage.test.ts` | test | file-I/O | self (extend) | exact |
| `lib/listings/filters.test.ts` | test | transform | self (extend) | exact |
| `lib/listings/subito-categories.test.ts` | test | transform | self (extend) | exact |
| `messages/key-parity.test.ts` | test | static | self (auto parity) | exact |

---

## Pattern Assignments

### `lib/geo/haversine.ts` (utility, transform)

**Analog:** `lib/geo/nearest-zone.ts` (geo module conventions); RESEARCH.md formula

**Module pattern** (lines 1-18 from `lib/geo/nearest-zone.ts`):

```typescript
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import type { VeniceZone } from '@/lib/listings/types';

/** Client-safe approximate zone from coordinates (display + fallback pin). */
export function nearestVeniceZone(lat: number, lng: number): VeniceZone {
  // ...
}
```

**Core pattern to implement:**

```typescript
const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
```

**Validation pattern:** Unit test with known coordinate pair (e.g. Venice center to Mestre ~8 km). No SSR guard needed — pure function.

---

### `lib/geo/format-distance.ts` (utility, transform)

**Analog:** RESEARCH.md D-15 spec; `formatRelativeTime` usage in `ListListingCard.tsx`

**Core pattern:**

```typescript
/** Smart metric units: "350 m" under 1 km; "2.3 km" at 1 km+ (D-15). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
```

**Usage in card** (from `ListListingCard.tsx` lines 33-34):

```typescript
const postedLabel = formatRelativeTime(listing.posted_at);
const metadata = [locationText, postedLabel].filter(Boolean).join(' · ');
```

Phase 10: prepend `formatDistance(distanceMeters)` when center + coords available.

---

### `lib/filter-prefs/storage.ts` (utility, file-I/O)

**Analog:** `lib/browse-center/storage.ts`

**Type + key pattern** (lines 1-8):

```typescript
export type BrowseCenter = {
  lat: number;
  lng: number;
  label?: string;
};

export const BROWSE_CENTER_STORAGE_KEY = 'shoumanwu_browse_center';
export const BROWSE_CENTER_CHANGE_EVENT = 'shoumanwu-browse-center-change';
```

**Parse with validation** (lines 10-26):

```typescript
function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function parseBrowseCenter(raw: string | null): BrowseCenter | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BrowseCenter>;
    if (!isValidCoordinate(parsed.lat, -90, 90) || !isValidCoordinate(parsed.lng, -180, 180)) {
      return null;
    }
    // ...
  } catch {
    return null;
  }
}
```

**Read/write/subscribe trio** (lines 36-65):

```typescript
export function readBrowseCenter(): BrowseCenter | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(BROWSE_CENTER_STORAGE_KEY);
  // cache check ...
}

export function writeBrowseCenter(center: BrowseCenter): BrowseCenter {
  if (typeof window === 'undefined') return center;
  const raw = JSON.stringify(center);
  localStorage.setItem(BROWSE_CENTER_STORAGE_KEY, raw);
  window.dispatchEvent(new CustomEvent(BROWSE_CENTER_CHANGE_EVENT, { detail: center }));
  return center;
}

export function subscribeBrowseCenter(onStoreChange: () => void): () => void {
  // BROWSE_CENTER_CHANGE_EVENT + storage listeners
}
```

**Phase 10 FilterPrefs type** (D-76):

```typescript
export type FilterPrefs = {
  radiusKm: number;       // 1–50, default 10
  radiusEnabled: boolean;
  city: 'all' | 'venice' | 'padova';
  categories: string[];
};

export const FILTER_PREFS_STORAGE_KEY = 'shoumanwu_filter_prefs';
export const FILTER_PREFS_CHANGE_EVENT = 'shoumanwu-filter-prefs-change';
```

Copy cache-invalidation pattern from browse-center; validate `radiusKm` clamp 1–50, city enum, categories as string array of known slugs.

---

### `lib/filter-prefs/storage.test.ts` (test, file-I/O)

**Analog:** `lib/browse-center/storage.test.ts`

**Test structure** (lines 1-41):

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BROWSE_CENTER_STORAGE_KEY, readBrowseCenter, writeBrowseCenter } from './storage';

describe('readBrowseCenter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when storage is empty', () => {
    expect(readBrowseCenter()).toBeNull();
  });

  it('returns null when JSON is corrupt', () => {
    localStorage.setItem(BROWSE_CENTER_STORAGE_KEY, '{not-json');
    expect(readBrowseCenter()).toBeNull();
  });

  it('returns null when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    expect(readBrowseCenter()).toBeNull();
    windowSpy.mockRestore();
  });
});
```

Add: round-trip, radius clamp, corrupt JSON defaults, change event dispatch.

---

### `components/shell/FeedFilterContext.tsx` (provider, event-driven)

**Analog:** `lib/browse-center/context.tsx` (persistence hydration) + `FeedScrollContext.tsx` (React context API)

**Browse center hydration** (lines 1-23 from `lib/browse-center/context.tsx`):

```typescript
'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';
import { readBrowseCenter, subscribeBrowseCenter, type BrowseCenter } from './storage';

export function BrowseCenterProvider({ children }: { children: React.ReactNode }) {
  const center = useSyncExternalStore(subscribeBrowseCenter, readBrowseCenter, () => null);
  return (
    <BrowseCenterContext.Provider value={center}>{children}</BrowseCenterContext.Provider>
  );
}
```

**FeedScrollContext provider shape** (lines 27-73 from `FeedScrollContext.tsx`):

```typescript
export function FeedScrollProvider({ children }: { children: ReactNode }) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // ...
  return (
    <FeedScrollContext.Provider value={{ headerHidden, searchQuery, setSearchQuery, registerScrollContainer }}>
      {children}
    </FeedScrollContext.Provider>
  );
}

export function useFeedScroll(): FeedScrollContextValue {
  const context = useContext(FeedScrollContext);
  if (!context) throw new Error('useFeedScroll must be used within FeedScrollProvider');
  return context;
}
```

**Phase 10 context API** (D-75):

```typescript
type AppliedFilters = FilterPrefs;
type DraftFilters = FilterPrefs;

type FeedFilterContextValue = {
  applied: AppliedFilters;
  draft: DraftFilters;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  setDraft: (partial: Partial<DraftFilters>) => void;
  resetDraftFromApplied: () => void;
  applyDraft: () => void;
  resetFilters: () => void;  // D-52 scope
  dismissCategory: (slug: string) => void;
  dismissCity: () => void;
  hasActiveFilters: boolean;  // D-56 dot badge
};
```

Hydrate `applied` via `useSyncExternalStore(subscribeFilterPrefs, readFilterPrefs, () => DEFAULT_FILTER_PREFS)`. Keep `draft` in `useState`, initialized from `applied` on sheet open (D-55).

---

### `components/listings/FilterSheet.tsx` (component, event-driven)

**Analog:** `components/settings/AlertCreateSheet.tsx` + `components/ui/drawer.tsx`

**Controlled drawer + dismiss reset** (lines 37-40, 91-92 from `AlertCreateSheet.tsx`):

```typescript
const handleOpenChange = (next: boolean) => {
  if (!next) resetForm();
  onOpenChange(next);
};

return (
  <Drawer open={open} onOpenChange={handleOpenChange}>
    <DrawerContent className="pb-space-xl">
```

**Phase 10 adaptation (D-51, D-53):** On close, call `resetDraftFromApplied()` not `applyDraft()`. Only `applyDraft()` commits to storage.

**Drawer imports** (lines 5-11):

```typescript
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
```

**DrawerContent sizing** (lines 86-88 from `drawer.tsx`):

```typescript
className={cn(
  'fixed inset-x-0 bottom-16 z-50 flex max-h-[95dvh] flex-col rounded-t-lg border border-outline-variant bg-surface outline-none',
  className,
)}
```

FilterSheet: pass `className="max-h-[85vh]"` (D-72). No `nonModal` — overlay dismiss required (D-73).

**Section layout pattern** (from `AlertCreateSheet.tsx` lines 99-120):

```typescript
<form className="flex flex-col gap-space-lg px-gutter pb-space-lg">
  <label className="flex flex-col gap-space-xs">
    <span className="text-label-md text-on-surface-variant">{label}</span>
    <input className="rounded border border-outline-variant bg-surface px-space-sm py-space-sm ..." />
  </label>
</form>
```

**City single-select:** Copy chip pattern from `ZoneChipSelector.tsx` (lines 8-40) but with `ConsumerCity` options `['all', 'venice', 'padova']` — not Venice zone enums.

**Category checklist:** Map `SUBITO_CATEGORY_SLUGS` with `getSubitoCategoryLabel(slug, language)` from `SubitoCategoryFilterChips.tsx` (lines 40-56). Use native checkbox inputs like `SettingsUi.tsx` (lines 20-28):

```typescript
<input
  type="checkbox"
  className="peer sr-only"
  checked={checked}
  onChange={(event) => onChange(event.target.checked)}
  aria-label={ariaLabel}
/>
```

**Sticky footer** (D-54): Replace AlertCreateSheet's inline buttons with:

```tsx
<footer className="sticky bottom-0 flex gap-space-sm border-t border-outline-variant bg-surface px-gutter py-space-md">
  <button type="button" className="flex-1 text-label-md text-on-surface-variant" onClick={resetFilters}>
    {messages.feed.resetFilters}
  </button>
  <button type="button" className="flex-1 rounded-lg bg-primary py-space-sm text-label-sm font-semibold text-on-primary" onClick={applyDraft}>
    {messages.feed.applyFilters}
  </button>
</footer>
```

**Radius slider:** No existing Slider component — use native `<input type="range" min={1} max={50} step={1} />` with `SettingsToggle` for enable/disable (D-58, D-16).

---

### `hooks/useDistanceCenter.ts` (hook, request-response) — optional extract

**Analog:** `components/ugc/PostForm.tsx` geolocation (lines 91-116)

**One-shot GPS pattern:**

```typescript
navigator.geolocation.getCurrentPosition(
  (position) => {
    setLat(position.coords.latitude);
    setLng(position.coords.longitude);
  },
  (positionError) => {
    // permission denied → fall through to Venice default
  },
  { enableHighAccuracy: true, timeout: 10000 },
);
```

**Center resolution chain** (D-04–09):

```typescript
const browseCenter = useBrowseCenter();
// Priority: browseCenter → gpsCenter → VENICE_DEFAULT { lat: 45.44, lng: 12.33 }
```

Browse center from `useBrowseCenter()` (lines 21-23 from `lib/browse-center/context.tsx`). No `watchPosition` (D-10).

---

### `components/shell/FeedHeaderRow.tsx` (component, event-driven)

**Analog:** self — extend `FeedActiveFilterPills` + replace filter stub

**Existing pill pattern** (lines 11-35):

```typescript
function FeedActiveFilterPills() {
  const { selectedCategory, setSelectedCategory } = useFeedScroll();
  if (selectedCategory === 'all') return null;
  const label = getSubitoCategoryLabel(selectedCategory, language);
  return (
    <div className="flex flex-wrap gap-space-sm px-gutter pb-space-sm">
      <button
        type="button"
        onClick={() => setSelectedCategory('all')}
        className="inline-flex items-center gap-space-xs rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-space-xs text-label-sm text-on-surface transition-opacity active:opacity-80"
      >
        <span>{label}</span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">close</span>
      </button>
    </div>
  );
}
```

**Replace stub** (lines 70-82) — remove toast, open sheet:

```typescript
// BEFORE:
onClick={() => toast(messages.feed.filterComingSoon)}

// AFTER:
onClick={() => setSheetOpen(true)}
```

**Dot badge** (D-56): Add relative wrapper on filter button; when `hasActiveFilters`, render `absolute top-1 right-1 h-2 w-2 rounded-full bg-primary`.

**Pill order** (D-66): Search → Center → Radius → City → Categories. Wire from `useFeedScroll()` (search) + `useBrowseCenter()` + `useFeedFilter()`.

**Remove shadow-sm** from filter/location buttons per Stitch D-74 — use `bg-surface-container-lowest` only (lines 73, 85).

---

### `components/shell/FeedScrollContext.tsx` (provider, event-driven)

**Analog:** self — remove category, keep scroll + search

**Remove from type** (lines 13-19):

```typescript
type FeedScrollContextValue = {
  headerHidden: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // DELETE: selectedCategory, setSelectedCategory
  registerScrollContainer: (element: HTMLElement | null) => void;
};
```

**Remove state** (lines 30, 66-67):

```typescript
const [selectedCategory, setSelectedCategory] = useState<SubitoCategoryFilter>('all');
// Remove from provider value
```

Keep scroll-away logic unchanged (lines 34-58).

---

### `components/listings/FeedHomeClient.tsx` (component, transform)

**Analog:** self — extend `useMemo` filter pipeline

**Current pipeline** (lines 38-44):

```typescript
const filteredListings = useMemo(() => {
  const visible = excludeReportedIds(listings, reportedIds);
  return visible.filter((listing) => {
    if (!matchesSubitoCategory(listing, selectedCategory)) return false;
    return matchesFeedSearch(listing, searchQuery, language, zoneLabel);
  });
}, [listings, reportedIds, searchQuery, selectedCategory, language, zoneLabel]);
```

**Phase 10 pipeline** (D-29 order: search → radius → city → categories → sort):

```typescript
const filteredListings = useMemo(() => {
  let rows = excludeReportedIds(listings, reportedIds);
  rows = rows.filter((l) => matchesFeedSearch(l, searchQuery, language, consumerCityLabel));
  if (applied.radiusEnabled && center) {
    rows = rows.filter((l) => hasValidCoords(l) && haversineKm(center, l) <= applied.radiusKm);
  }
  rows = rows.filter((l) => matchesConsumerCity(l, applied.city));
  if (applied.categories.length > 0) {
    rows = rows.filter((l) => matchesAnySubitoCategories(l, applied.categories));
  }
  if (center) return sortByDistance(rows, center);
  return sortByPostedAtDesc(rows);
}, [listings, reportedIds, searchQuery, applied, center, language]);
```

**Empty state predicate** (lines 46-47, extend per RESEARCH open question #2):

```typescript
const hasActiveFilters =
  applied.radiusEnabled ||
  applied.city !== 'all' ||
  applied.categories.length > 0;
// Use: hasSearchQuery || hasActiveFilters for emptySearch* strings
```

**Pass distance to cards:**

```tsx
<ListListingCard key={listing.id} listing={listing} distanceMeters={distanceMap.get(listing.id)} />
```

---

### `components/listings/ListListingCard.tsx` (component)

**Analog:** self — extend metadata line

**Current metadata** (lines 14-34, 71-77):

```typescript
function listingLocationLabel(listing, zoneLabel): string {
  if (listing.zone) return zoneLabel(listing.zone);  // REPLACE with city-only
  if (listing.city) return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  return '';
}

const metadata = [locationText, postedLabel].filter(Boolean).join(' · ');
```

**Phase 10 change (D-60–63):**

```typescript
type ListListingCardProps = {
  listing: ListingRow;
  distanceMeters?: number | null;
};

// When distanceMeters != null: `${formatDistance(distanceMeters)} · ${postedLabel}`
// When no center: consumer city name (Venice/Padova trilingual) or time-only
// No-coord: omit distance segment (D-25)
```

Remove `zoneLabel(listing.zone)` — use `messages.feed.cityVenice` / `cityPadova` keys (D-36, D-38).

---

### `components/map/SelectLocationClient.tsx` (component, file-I/O)

**Analog:** self — remove zone chips, keep confirm flow

**Confirm writes center** (lines 86-90):

```typescript
const handleConfirm = () => {
  const label = resolveLabel();
  writeBrowseCenter({ lat: center.lat, lng: center.lng, label });
  router.push('/');
};
```

**Remove** (lines 103-107): `SelectLocationZoneChips` import and render (D-32).

**Remove zone state** (lines 42, 54, 57-70): `selectedZone`, `handleZoneChange`, zone flyTo.

**Label fix (D-01):** Replace `resolveLabel()` zone-derived labels with city-level trilingual names — avoid `zoneLabel(nearest)` (lines 72-84).

Keep map pan + center pin unchanged (lines 110-128).

---

### `lib/listings/filters.ts` (utility, transform)

**Analog:** self — extend with city/radius helpers

**Existing coord guard** (lines 15-17):

```typescript
export function filterMapListings(listings: ListingRow[]): ListingRow[] {
  return listings.filter((listing) => listing.lat != null && listing.lng != null);
}
```

**Reuse as `hasValidCoords`** (D-27): both lat AND lng required.

**Add exports:**

```typescript
export type ConsumerCity = 'all' | 'venice' | 'padova';

export function listingConsumerCity(listing: ListingRow): 'venice' | 'padova' | null { /* D-02, D-34 */ }
export function matchesConsumerCity(listing: ListingRow, city: ConsumerCity): boolean { /* D-35 */ }
export function filterByRadiusKm(listings, center, radiusKm): ListingRow[] { /* D-21 */ }
export function sortByDistance(listings, center): ListingRow[] { /* D-11 */ }
export function sortByPostedAtDesc(listings): ListingRow[] { /* Phase 9 fallback */ }
```

Padova test fixture already in `filters.test.ts` (lines 21-28).

---

### `lib/listings/subito-categories.ts` (utility, transform)

**Analog:** self — extend `matchesSubitoCategory`

**Single-slug match** (lines 26-37):

```typescript
export function matchesSubitoCategory(
  listing: SubitoListingFilterInput,
  selected: SubitoCategoryFilter,
): boolean {
  if (selected === 'all') return true;
  if (listing.category) return listing.category === selected;
  const inferred = inferListingCategory(listing.title);
  if (!inferred) return false;
  return legacySlugFromInferred(inferred) === selected;
}
```

**Add OR multi-select** (D-40):

```typescript
export function matchesAnySubitoCategories(
  listing: SubitoListingFilterInput,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((slug) => matchesSubitoCategory(listing, slug));
}
```

Keep `SUBITO_CATEGORY_SLUGS` and `getSubitoCategoryLabel` unchanged for sheet checklist (D-42).

---

### `lib/browse-center/storage.ts` (utility, file-I/O)

**Analog:** self — add `clearBrowseCenter` for center pill dismiss (D-12)

**Write pattern to mirror** (lines 44-51):

```typescript
export function writeBrowseCenter(center: BrowseCenter): BrowseCenter {
  if (typeof window === 'undefined') return center;
  const raw = JSON.stringify(center);
  localStorage.setItem(BROWSE_CENTER_STORAGE_KEY, raw);
  invalidateBrowseCenterCache(raw);
  window.dispatchEvent(new CustomEvent(BROWSE_CENTER_CHANGE_EVENT, { detail: center }));
  return center;
}
```

**Add:**

```typescript
export function clearBrowseCenter(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BROWSE_CENTER_STORAGE_KEY);
  invalidateBrowseCenterCache(null);
  window.dispatchEvent(new CustomEvent(BROWSE_CENTER_CHANGE_EVENT, { detail: null }));
}
```

Export from `lib/browse-center/context.tsx` alongside `writeBrowseCenter`.

---

### `components/shell/AppChrome.tsx` (provider, route-conditional)

**Analog:** self — nest `FeedFilterProvider` with `FeedScrollProvider`

**Current feed branch** (lines 40-49):

```typescript
if (showFeedHeader) {
  return (
    <FeedScrollProvider>
      <div className="app-shell">
        <FeedHeaderRow />
        <div className="app-main min-h-0">{children}</div>
      </div>
      {showBottomNav && <BottomNav />}
    </FeedScrollProvider>
  );
}
```

**Phase 10:**

```typescript
if (showFeedHeader) {
  return (
    <FeedFilterProvider>
      <FeedScrollProvider>
        {/* unchanged shell */}
      </FeedScrollProvider>
    </FeedFilterProvider>
  );
}
```

`BrowseCenterProvider` stays in `app/layout.tsx` (lines 48-60) — global, not feed-scoped.

---

### `lib/listings/feed-search.ts` (utility, transform)

**Analog:** self — update `listingLocationLabel` for city-only search (D-01)

**Current zone-based label** (lines 8-18):

```typescript
function listingLocationLabel(listing, zoneLabel): string {
  if (listing.zone) return zoneLabel(listing.zone);
  if (listing.city) return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  return '';
}
```

Replace with consumer city mapping (`listingConsumerCity` + trilingual labels) so search matches "Venice"/"Padova" not zone subdivisions.

---

### `messages/{zh,en,it}.ts` (config, static)

**Analog:** existing `feed` section in `messages/en.ts` (lines 47-57)

```typescript
feed: {
  searchPlaceholder: 'Search items…',
  filterComingSoon: 'Filters coming soon',  // DELETE (D-81)
  openFilters: 'Filters',
  // ADD: filtersTitle, applyFilters, resetFilters, radiusLabel, cityLabel,
  // categoriesLabel, clearSelection, withinKm template, cityVenice, cityPadova,
  // myLocation, centerPill aria labels, etc.
},
```

Follow trilingual parity enforced by `messages/key-parity.test.ts` — all three locales must gain/lose keys together.

---

### Test file extensions

**`lib/listings/filters.test.ts`** — extend with `listingConsumerCity`, `matchesConsumerCity`, `filterByRadiusKm`, `sortByDistance` cases. Use `baseListing` fixture (lines 5-17).

**`lib/listings/subito-categories.test.ts`** — add `matchesAnySubitoCategories` OR tests (lines 4-24 pattern).

**`lib/browse-center/storage.test.ts`** — add `clearBrowseCenter` removes key + dispatches event.

**`lib/geo/haversine.test.ts`** / **`format-distance.test.ts`** — new files mirroring `filters.test.ts` structure.

---

## Shared Patterns

### localStorage Module (read/write/subscribe)

**Source:** `lib/browse-center/storage.ts`
**Apply to:** `lib/filter-prefs/storage.ts`, extend `lib/browse-center/storage.ts`

```typescript
// SSR guard on read
if (typeof window === 'undefined') return null;

// Parse with try/catch + typed validation
// Cache raw string to avoid re-parse
// CustomEvent + storage listener for cross-tab sync
window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
```

### useSyncExternalStore Hydration

**Source:** `lib/browse-center/context.tsx`
**Apply to:** `FeedFilterContext` applied-filter hydration (D-78)

```typescript
const applied = useSyncExternalStore(
  subscribeFilterPrefs,
  readFilterPrefs,
  () => DEFAULT_FILTER_PREFS,  // SSR snapshot
);
```

### Controlled Vaul Drawer with Draft Discard

**Source:** `components/settings/AlertCreateSheet.tsx`
**Apply to:** `FilterSheet.tsx`

```typescript
const handleOpenChange = (next: boolean) => {
  if (!next) resetDraftFromApplied();  // NOT applyDraft
  setSheetOpen(next);
};
```

### Active Filter Pill UI

**Source:** `components/shell/FeedHeaderRow.tsx` lines 22-34
**Apply to:** All dismissible pills (search, center, radius, city, categories)

```typescript
className="inline-flex items-center gap-space-xs rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-space-xs text-label-sm text-on-surface transition-opacity active:opacity-80"
```

Material Symbols `close` icon at 16px for dismiss affordance.

### Client-Side Filter Pipeline useMemo

**Source:** `components/listings/FeedHomeClient.tsx`
**Apply to:** Extended pipeline with haversine + sort branch

```typescript
const filteredListings = useMemo(() => {
  let rows = excludeReportedIds(listings, reportedIds);
  // compose filters in locked order D-29
  // sort branch: center active → nearest-first, else posted_at desc
}, [listings, reportedIds, searchQuery, applied, center, language]);
```

### i18n via useMessages

**Source:** All feed components
**Apply to:** FilterSheet, pills, card city labels

```typescript
const { messages, language } = useMessages();
// All new strings under messages.feed.*
```

### One-Shot Geolocation

**Source:** `components/ugc/PostForm.tsx` lines 98-115
**Apply to:** `useDistanceCenter` GPS fallback

```typescript
{ enableHighAccuracy: true, timeout: 10000 }
// No watchPosition (D-10)
// Denied → Venice default (45.44, 12.33) per D-08
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/geo/haversine.ts` | utility | transform | No existing distance math; nearest-zone uses squared distance not haversine — use RESEARCH.md formula |
| Radius `<input type="range">` in FilterSheet | component | event-driven | No Slider/Radix slider in codebase; native range input is acceptable per discretion |

---

## Metadata

**Analog search scope:** `lib/geo/`, `lib/browse-center/`, `lib/listings/`, `lib/settings/`, `lib/filter-prefs/` (new), `components/shell/`, `components/listings/`, `components/settings/`, `components/map/`, `components/ui/drawer.tsx`, `components/ugc/PostForm.tsx`, `messages/`
**Files scanned:** ~35 source files
**Pattern extraction date:** 2026-08-10
