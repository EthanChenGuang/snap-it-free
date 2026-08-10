# Phase 11: Grid Listing Cards - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 9 new/modified files
**Analogs found:** 8 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/listings/ListListingCard.tsx` | component | transform | `components/listings/ListListingCard.tsx` (self) + `ListingCard.tsx` (claimed) | exact |
| `components/listings/FavoritesPageClient.tsx` | component | event-driven | `components/listings/FeedHomeClient.tsx` | exact |
| `lib/listings/card-metadata.ts` | utility | transform | `lib/geo/format-distance.ts` + inline `buildCardMetadata` | exact |
| `lib/listings/card-metadata.test.ts` | test | transform | `lib/geo/format-distance.test.ts` | exact |
| `components/listings/FeedHomeClient.tsx` | component | request-response | *(reference only — unchanged)* | exact |
| `components/listings/FavoriteButton.tsx` | component | event-driven | *(reference only — unchanged)* | exact |
| `components/listings/ListingPhoto.tsx` | component | file-I/O | *(reference only — unchanged)* | exact |
| `components/listings/ListPageClient.tsx` | component | request-response | `components/listings/FeedHomeClient.tsx` | role-match |
| `messages/{zh,en,it}.ts` | config | transform | existing `listing.reserved` keys | exact |

## Pattern Assignments

### `components/listings/ListListingCard.tsx` (component, transform)

**Analog:** Self (baseline) + `components/listings/ListingCard.tsx` (claimed status only — do **not** port `ReservedBadge` overlay per D-17)

**Imports pattern** (lines 1-10):

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { listingConsumerCityLabel } from '@/lib/listings/feed-search';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';
// Phase 11: import buildCardMetadata from '@/lib/listings/card-metadata'
// Phase 11: import { cn } from '@/lib/utils' for claimed dimming
```

**Props pattern** (lines 12-16):

```typescript
type ListListingCardProps = {
  listing: ListingRow;
  /** Distance in meters from active center; null when coords or center unavailable. */
  distanceMeters?: number | null;
};
```

**Metadata composition pattern** — replace inline `buildCardMetadata` with extracted helper (lines 34-39 → extend):

```typescript
const cityLabel = listingConsumerCityLabel(listing, {
  venice: messages.feed.cityVenice,
  padova: messages.feed.cityPadova,
});
const postedLabel = formatRelativeTime(listing.posted_at);
const metadata = buildCardMetadata({
  distanceMeters,
  cityLabel,
  postedLabel,
  isClaimed: listing.status === 'claimed',
  reservedLabel: messages.listing.reserved,
});
```

**Whole-card navigation + heart stopPropagation** (lines 41-52, 64-69):

```typescript
<article
  className="group flex cursor-pointer flex-col"
  onClick={() => router.push(`/listing/${listing.id}`)}
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      router.push(`/listing/${listing.id}`);
    }
  }}
  role="link"
  tabIndex={0}
>
  {/* ... */}
  <FavoriteButton
    listingId={listing.id}
    size="sm"
    tone="overlay"
    className="absolute right-space-sm top-space-sm h-9 w-9 rounded-full bg-black/30 p-2 backdrop-blur-md transition hover:scale-105 hover:bg-black/40"
  />
```

**FREE badge overlay** (lines 61-63 — retain per D-02, do not restyle to Stitch monochrome):

```typescript
<span className="absolute left-space-sm top-space-sm rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
  {messages.listing.free}
</span>
```

**Claimed dimming pattern** — apply opacity to `ListingPhoto` only (not container) to keep FREE/heart full brightness (D-21, RESEARCH Pitfall 2):

```typescript
// From ListingCard claimed check (line 70) — status check only, NOT ReservedBadge import:
// listing.status === 'claimed'

<div className="relative mb-space-sm aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-high">
  <ListingPhoto
    src={listing.photo_url}
    alt={displayTitle}
    className={cn(
      'object-cover transition-transform duration-500 group-hover:scale-105',
      listing.status === 'claimed' && 'opacity-60',
    )}
    sizes="(max-width: 768px) 50vw, 400px"
  />
  {/* FREE + heart overlays stay outside photo opacity */}
</div>
```

**Metadata typography** (lines 76-82 — unchanged):

```typescript
<p
  className="mt-space-xs line-clamp-1 text-xs text-on-surface-variant"
  suppressHydrationWarning
>
  {metadata}
</p>
```

---

### `components/listings/FavoritesPageClient.tsx` (component, event-driven)

**Analog:** `components/listings/FeedHomeClient.tsx`

**Remove duplicate heart** — delete wrapper block (lines 165-174); current bug:

```typescript
// DELETE this pattern:
<div key={listing.id} className="relative">
  <div className="absolute right-space-sm top-space-sm z-10">
    <FavoriteButton
      listingId={listing.id}
      size="sm"
      className="rounded-full bg-surface/90 backdrop-blur-sm"
    />
  </div>
  <ListListingCard listing={listing} />
</div>
```

**Grid + distance wiring pattern** — copy from `FeedHomeClient` (lines 23, 89-95):

```typescript
// FeedHomeClient reference:
import { useDistanceCenter } from '@/hooks/useDistanceCenter';
import { haversineKm } from '@/lib/geo/haversine';

const { center } = useDistanceCenter(false); // radius off on favorites (D-23)

<section className="grid grid-cols-2 gap-3">
  {listings.map((listing) => (
    <ListListingCard
      key={listing.id}
      listing={listing}
      distanceMeters={
        listing.lat != null && listing.lng != null
          ? haversineKm(center, { lat: listing.lat, lng: listing.lng }) * 1000
          : null
      }
    />
  ))}
</section>
```

**Distance map construction reference** from `composeFeedListings` (lines 84-91 in `hooks/useDistanceCenter.ts`):

```typescript
const distanceMap = new Map<string, number>();
if (center) {
  for (const listing of rows) {
    if (listing.lat != null && listing.lng != null) {
      const km = haversineKm(center, { lat: listing.lat, lng: listing.lng });
      distanceMap.set(listing.id, km * 1000);
    }
  }
}
```

**Grid gap alignment** — change `gap-space-md` → `gap-3` to match feed (D-26):

```typescript
// FeedHomeClient line 89:
<section className="grid grid-cols-2 gap-3">
```

**Remove unused import** after fix:

```typescript
// Remove: import { FavoriteButton } from '@/components/listings/FavoriteButton';
```

**Preserve existing patterns** — auth/sync banner, empty state, `FAVORITES_CHANGE_EVENT` reload (lines 38-98, 100-107) unchanged.

---

### `lib/listings/card-metadata.ts` (utility, transform)

**Analog:** `lib/geo/format-distance.ts` (pure function) + inline `buildCardMetadata` in `ListListingCard.tsx` (lines 18-27)

**Pure function pattern** from `format-distance.ts` (lines 1-5):

```typescript
/** Smart metric units: "350 m" under 1 km; "2.3 km" at 1 km+ (D-15). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
```

**Extract and extend inline builder** from `ListListingCard.tsx` (lines 18-27):

```typescript
import { formatDistance } from '@/lib/geo/format-distance';

export type BuildCardMetadataInput = {
  distanceMeters: number | null | undefined;
  cityLabel: string;
  postedLabel: string;
  isClaimed: boolean;
  reservedLabel: string;
};

export function buildCardMetadata(input: BuildCardMetadataInput): string {
  const { distanceMeters, cityLabel, postedLabel, isClaimed, reservedLabel } = input;
  let base: string;
  if (distanceMeters != null) {
    base = `${formatDistance(distanceMeters)} · ${postedLabel}`;
  } else {
    base = [cityLabel, postedLabel].filter(Boolean).join(' · ');
  }
  if (isClaimed && reservedLabel) {
    return `${base} · ${reservedLabel}`;
  }
  return base;
}
```

**City label helper** — consume via caller; do not duplicate. Source: `lib/listings/feed-search.ts` (lines 15-26):

```typescript
export function listingConsumerCityLabel(
  listing: ListingRow,
  cityLabels: ConsumerCityLabels,
): string {
  const city = listingConsumerCity(listing);
  if (city === 'venice') return cityLabels.venice;
  if (city === 'padova') return cityLabels.padova;
  if (listing.city) {
    return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  }
  return '';
}
```

---

### `lib/listings/card-metadata.test.ts` (test, transform)

**Analog:** `lib/geo/format-distance.test.ts` + `lib/listings/feed-search.test.ts`

**Test file structure** from `format-distance.test.ts` (lines 1-13):

```typescript
import { describe, expect, it } from 'vitest';
import { buildCardMetadata } from './card-metadata';

describe('buildCardMetadata', () => {
  it('renders distance · time when meters present (CARD-02)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: 2300,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('2.3 km · 3h ago');
  });

  it('renders city · time fallback when no distance (CARD-01, D-19)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: null,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('Venice · 3h ago');
  });

  it('appends reserved suffix when claimed (D-17)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: 2300,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: 'Reserved',
      }),
    ).toBe('2.3 km · 3h ago · Reserved');
  });

  it('handles claimed + no city + no distance (D-19 edge)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: null,
        cityLabel: '',
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: 'Reserved',
      }),
    ).toBe('3h ago · Reserved');
  });
});
```

**Base listing fixture pattern** from `feed-search.test.ts` (lines 5-17):

```typescript
const baseListing: ListingRow = {
  id: '11111111-1111-1111-1111-111111111111',
  source: 'subito',
  title: 'Lampada gratis',
  photo_url: 'https://example.com/photo.jpg',
  external_url: 'https://subito.it/annunci/1',
  lat: 45.44,
  lng: 12.33,
  zone: 'centro_storico',
  posted_at: '2026-07-28T10:00:00.000Z',
  expires_at: '2026-07-30T10:00:00.000Z',
  status: 'active',
};
```

**Vitest scope** — `vitest.config.ts` includes `lib/**/*.test.ts`; no config change needed.

---

### `components/listings/FeedHomeClient.tsx` (reference only — unchanged)

**Analog:** Self — canonical grid + distance reference for favorites parity.

**Grid render pattern** (lines 89-96):

```typescript
<section className="grid grid-cols-2 gap-3">
  {filteredListings.map((listing) => (
    <ListListingCard
      key={listing.id}
      listing={listing}
      distanceMeters={distanceMap.get(listing.id) ?? null}
    />
  ))}
</section>
```

**Distance center hook** (line 23):

```typescript
const { center } = useDistanceCenter(mapModeActive);
```

---

### `components/listings/FavoriteButton.tsx` (reference only — unchanged)

**Analog:** Self — heart behavior locked for grid cards.

**Auth gate + stopPropagation** (lines 55-66):

```typescript
const handleClick = async (event: React.MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  if (hasSession === false) {
    setAuthOpen(true);
    return;
  }

  const added = await toggle(listingId);
  toast(added ? messages.favorites.added : messages.favorites.removed);
};
```

**Overlay tone + orange favorited** (lines 82-88):

```typescript
className={cn(
  'material-symbols-outlined text-[22px]',
  favorited
    ? 'text-accent-orange'
    : tone === 'overlay'
      ? 'text-white'
      : 'text-on-surface-variant',
)}
```

---

### `components/listings/ListingPhoto.tsx` (reference only — unchanged)

**Analog:** Self — placeholder + className passthrough for claimed dimming.

**Placeholder fallback** (lines 26-36):

```typescript
if (!src || failed) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-surface-container-high text-on-surface-variant',
        fallbackClassName,
      )}
    >
      <span className="material-symbols-outlined">image</span>
    </div>
  );
}
```

**Image with className prop** (lines 39-49) — pass claimed opacity here, not on container.

---

### `components/listings/ListPageClient.tsx` (component, request-response)

**Analog:** `FeedHomeClient` (grid consumer) — inherits card polish automatically (D-22).

**Current usage** (lines 86-89) — no Phase 11 changes required unless adding optional distance later:

```typescript
<section className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
  {filteredListings.map((listing) => (
    <ListListingCard key={listing.id} listing={listing} />
  ))}
</section>
```

---

### `messages/{zh,en,it}.ts` (config, transform)

**Analog:** Existing `listing.reserved` keys (D-29 — reuse, no new key unless UAT fails)

| Key | zh | en | it |
|-----|----|----|-----|
| `listing.free` | 免费 | Free | Gratis |
| `listing.reserved` | 已预订 | Reserved | Riservato |

**Usage pattern** from `ReservedBadge.tsx` (lines 8-10):

```typescript
<span className="...">
  {messages.listing.reserved}
</span>
```

Grid metadata suffix uses same key inline (no uppercase CSS on suffix per RESEARCH A4).

**Parity test** — run `messages/key-parity.test.ts` if any new keys added.

---

## Shared Patterns

### i18n via useMessages
**Source:** `components/listings/ListListingCard.tsx` (lines 31, 35-38)
**Apply to:** `ListListingCard`, `FavoritesPageClient`

```typescript
const { language, messages, formatRelativeTime } = useMessages();
const cityLabel = listingConsumerCityLabel(listing, {
  venice: messages.feed.cityVenice,
  padova: messages.feed.cityPadova,
});
const postedLabel = formatRelativeTime(listing.posted_at);
```

### Distance Pipeline (read-only — D-30)
**Source:** `hooks/useDistanceCenter.ts` + `lib/geo/haversine.ts`
**Apply to:** `FavoritesPageClient` only (feed already wired)

```typescript
import { useDistanceCenter } from '@/hooks/useDistanceCenter';
import { haversineKm } from '@/lib/geo/haversine';

const { center } = useDistanceCenter(false);
// meters = haversineKm(center, { lat, lng }) * 1000
```

### Claimed Status — Grid vs Map Divergence
**Source:** `components/listings/ListingCard.tsx` (line 70) vs Phase 11 CONTEXT D-17
**Apply to:** `ListListingCard` only

- **Map `ListingCard`:** `ReservedBadge` overlay on image
- **Grid `ListListingCard`:** metadata suffix + photo dim — **do not import `ReservedBadge`**

```typescript
// Map pattern (DO NOT copy to grid):
{listing.status === 'claimed' && <ReservedBadge />}

// Grid pattern (Phase 11):
isClaimed: listing.status === 'claimed'
// + messages.listing.reserved suffix in metadata
// + ListingPhoto opacity-60
```

### Client Component Convention
**Source:** All listing components
**Apply to:** All modified components

```typescript
'use client';
```

Path alias: `@/` → project root (see `vitest.config.ts` resolve.alias).

### Stitch Token Styling
**Source:** `ListListingCard.tsx` existing classes
**Apply to:** UI changes in `ListListingCard` only

- Spacing: `space-sm`, `space-xs`, `space-md` tokens
- Typography: `text-label-md`, `text-xs text-on-surface-variant`
- Surfaces: `bg-surface-container-high`, `text-on-surface`
- **Documented overrides (D-02, D-07, D-09, D-10):** emerald FREE pill, `rounded-2xl`, glass heart, orange favorited

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none)* | — | — | All Phase 11 files have direct codebase analogs |

## Metadata

**Analog search scope:** `components/listings/`, `lib/listings/`, `lib/geo/`, `hooks/`, `messages/`
**Files scanned:** 12 primary + 48 test files in lib/
**Pattern extraction date:** 2026-08-10
