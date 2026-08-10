# Phase 12: Canonical Category Mapping - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 13
**Analogs found:** 11 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/listings/canonical-categories.ts` | utility | transform | `lib/listings/subito-categories.ts` | exact |
| `lib/listings/canonical-categories.test.ts` | test | unit | `lib/listings/subito-categories.test.ts` | exact |
| `lib/listings/subito-categories.ts` | utility | transform | `lib/listings/subito-categories.ts` (self) | exact |
| `lib/listings/subito-categories.test.ts` | test | unit | `lib/listings/subito-categories.test.ts` (self) | exact |
| `lib/i18n/listing-fields.ts` | utility | transform | `lib/i18n/listing-fields.ts` (self) | exact |
| `lib/i18n/listing-fields.test.ts` | test | unit | `lib/i18n/listing-fields.test.ts` (self) | exact |
| `lib/ugc/schemas.ts` | config/validation | request-response | `lib/ugc/schemas.ts` (self) | exact |
| `app/api/ugc/listings/route.ts` | route | CRUD | `app/api/ugc/listings/route.ts` (self) | exact |
| `components/ugc/PostForm.tsx` | component | request-response | `components/ugc/PostForm.tsx` (self) | exact |
| `hooks/useDistanceCenter.ts` | hook | transform | `hooks/useDistanceCenter.ts` (self) | partial |
| `components/listings/ListPageClient.tsx` | component | transform | `components/listings/ListPageClient.tsx` (self) | partial |
| `components/map/MapExplorer.tsx` | component | transform | `components/map/MapExplorer.tsx` (self) | partial |
| `.planning/ROADMAP.md` + `REQUIREMENTS.md` + `PROJECT.md` | config | batch | — | no analog |

## Pattern Assignments

### `lib/listings/canonical-categories.ts` (utility, transform)

**Analog:** `lib/listings/subito-categories.ts` + `lib/admin/subito-regalo-catalog.ts` + `lib/listings/categories.ts`

This new module consolidates logic currently split across `subito-categories.ts` (`legacySlugFromInferred`), `listing-fields.ts` (duplicate `slugMap`), and scattered inference calls. Follow the existing lib/listings pure-function style.

**Imports pattern** (from `subito-categories.ts` lines 1-3, extend with types):

```typescript
import { SUBITO_REGALO_CATALOG, type SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import { inferListingCategory } from './categories';
import type { ListingSource } from './types';
```

**Catalog validation pattern** (from `subito-categories.ts` lines 18-20 — reuse Set/Map over catalog):

```typescript
const CATALOG_LABEL_BY_SLUG = new Map(
  SUBITO_REGALO_CATALOG.map((entry) => [entry.slug, entry.labelIt] as const),
);
```

For canonical module, build `CATALOG_SLUGS = new Set(SUBITO_REGALO_CATALOG.map((e) => e.slug))` and validate in `normalizeCatalogSlug`.

**Inference → slug map pattern** (from `subito-categories.ts` lines 68-78 — move here, do not duplicate):

```typescript
/** Maps legacy title-inference buckets to nearest Subito slug for fallback only. */
function legacySlugFromInferred(inferred: Exclude<import('./categories').ListingCategory, 'All'>): string {
  const map: Record<Exclude<import('./categories').ListingCategory, 'All'>, string> = {
    furniture: 'arredamento-casalinghi',
    tech: 'informatica',
    apparel: 'abbigliamento-accessori',
    books: 'libri-riviste',
    home_decor: 'arredamento-casalinghi',
  };
  return map[inferred];
}
```

Export as `INFERRED_CATEGORY_TO_SLUG` (public) and add `POST_CATEGORY_TO_SLUG` per CONTEXT D-11.

**Resolution order pattern** (from `subito-categories.ts` lines 22-37 — DB slug first, inference fallback):

```typescript
/**
 * Prefer DB `listing.category` slug over title keyword inference (D-29).
 * Title inference is fallback only when category column is null.
 */
export function matchesSubitoCategory(
  listing: SubitoListingFilterInput,
  selected: SubitoCategoryFilter,
): boolean {
  if (selected === 'all') return true;
  if (listing.category) {
    return listing.category === selected;
  }
  const inferred = inferListingCategory(listing.title);
  if (!inferred) return false;
  return legacySlugFromInferred(inferred) === selected;
}
```

New resolver extends this: validate DB slug against catalog (unknown → continue chain to inference per D-18), add `source` for Facebook stub (D-09), return `SubitoRegaloSlug | null`.

**ListingSource type** (from `lib/listings/types.ts` lines 1-7):

```typescript
export type ListingSource = 'subito' | 'facebook' | 'ugc';
```

---

### `lib/listings/canonical-categories.test.ts` (test, unit)

**Analog:** `lib/listings/subito-categories.test.ts` + `lib/listings/card-metadata.test.ts`

**Test file structure** (from `subito-categories.test.ts` lines 1-3):

```typescript
import { describe, expect, it } from 'vitest';
import { getSubitoCategoryLabel, matchesAnySubitoCategories, matchesSubitoCategory } from './subito-categories';
```

Colocate next to module (`./canonical-categories`). Use decision-ID references in test names (D-29, D-44, CAT-01) per project convention.

**Resolution order test cases** (from `subito-categories.test.ts` lines 4-24):

```typescript
describe('matchesSubitoCategory', () => {
  it('prefers listing.category DB slug over title inference (D-29)', () => {
    const listing = {
      title: 'Divano in ottime condizioni',
      category: 'informatica',
    };
    expect(matchesSubitoCategory(listing, 'informatica')).toBe(true);
    expect(matchesSubitoCategory(listing, 'arredamento-casalinghi')).toBe(false);
  });

  it('falls back to title inference when category is null', () => {
    expect(
      matchesSubitoCategory({ title: 'Monitor 24 pollici', category: null }, 'informatica'),
    ).toBe(true);
  });
});
```

Add new cases: unknown slug → inference retry (D-18), facebook stub → null (D-09), all six PostCategory mappings (D-11).

**baseListing fixture pattern** (from `lib/listings/feed-search.test.ts` lines 5-17):

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

Use `ListingRow` fixtures with explicit `source: 'ugc' | 'subito' | 'facebook'` when testing source-specific paths.

---

### `lib/listings/subito-categories.ts` (utility, transform — refactor)

**Analog:** `lib/listings/subito-categories.ts` (self) + `lib/listings/feed-search.ts` (thin consumer)

**Delegate to resolver** — replace inline inference/slug logic with canonical import. Extend input type to include `source`:

```typescript
type SubitoListingFilterInput = {
  title: string;
  category?: string | null;
};
```

Add optional `source?: ListingSource` (default `'subito'` for backward compat). `ListingRow` already has `source` (`types.ts` line 7).

**OR matching pattern** (lines 39-46 — preserve D-40, D-44 semantics):

```typescript
/** OR match across multiple category slugs; empty selection passes all (D-40, D-44). */
export function matchesAnySubitoCategories(
  listing: SubitoListingFilterInput,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((slug) => matchesSubitoCategory(listing, slug));
}
```

Refactored `matchesSubitoCategory` should call `resolveCanonicalCategorySlug` then compare to `selected`. Keep `getSubitoCategoryLabel` and `SUBITO_CATEGORY_SLUGS` unchanged (FilterSheet UI depends on them).

**Consumer delegation pattern** (from `feed-search.ts` lines 1-7, 40-44):

```typescript
import {
  resolveListingDescription,
  resolveListingTitle,
} from '@/lib/i18n/listing-fields';
// ...
const title = resolveListingTitle(listing, locale).toLowerCase();
```

Filter functions stay thin — delegate resolution, keep comparison logic local.

---

### `lib/listings/subito-categories.test.ts` (test, unit — extend)

**Analog:** `lib/listings/subito-categories.test.ts` (self)

**Preserve D-44 uncategorized behavior** (lines 52-71):

```typescript
describe('matchesAnySubitoCategories', () => {
  const uncategorizedListing = { title: 'Oggetto generico', category: null };

  it('returns true when no categories selected (D-44)', () => {
    expect(matchesAnySubitoCategories(uncategorizedListing, [])).toBe(true);
  });

  it('returns false for uncategorized listing when filter active (D-44)', () => {
    expect(matchesAnySubitoCategories(uncategorizedListing, ['informatica'])).toBe(false);
  });
});
```

Add test: unknown DB slug + keyword title still matches via inference (D-18). Add test: pass `source: 'facebook'` returns no match unless slug valid.

---

### `lib/i18n/listing-fields.ts` (utility, transform — refactor)

**Analog:** `lib/i18n/listing-fields.ts` (self)

**Locale fallback helper** (lines 21-23):

```typescript
function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
```

**Current resolveListingCategory** (lines 60-85 — refactor to use resolver, remove duplicate slugMap):

```typescript
/**
 * Resolve listing category badge label for display by active locale (D-31).
 * DB slug → category_en/category_zh when populated; Italian catalog fallback.
 * Title keyword inference only when category column is null.
 */
export function resolveListingCategory(
  row: ListingCategoryFieldRow,
  locale: AppLanguage,
): string | null {
  if (nonEmpty(row.category)) {
    return getSubitoCategoryLabel(row.category, locale, {
      category_en: row.category_en,
      category_zh: row.category_zh,
    });
  }
  const inferred = inferListingCategory(row.title);
  if (!inferred) return null;
  const slugMap: Record<Exclude<import('@/lib/listings/categories').ListingCategory, 'All'>, string> = {
    furniture: 'arredamento-casalinghi',
    tech: 'informatica',
    apparel: 'abbigliamento-accessori',
    books: 'libri-riviste',
    home_decor: 'arredamento-casalinghi',
  };
  return getSubitoCategoryLabel(slugMap[inferred], locale);
}
```

Replace with: `resolveCanonicalCategorySlug({ source, title, category })` → `getSubitoCategoryLabel(slug, locale, translations)`. Extend `ListingCategoryFieldRow` usage to accept optional `source` from `ListingRow`.

**Title/description resolver pattern** (lines 30-37 — same fallback chain, copy structure):

```typescript
export function resolveListingTitle(row: ListingFieldRow, locale: AppLanguage): string {
  if (locale === 'en' && nonEmpty(row.title_en)) {
    return row.title_en;
  }
  if (locale === 'zh' && nonEmpty(row.title_zh)) {
    return row.title_zh;
  }
  return row.title;
}
```

---

### `lib/i18n/listing-fields.test.ts` (test, unit — extend)

**Analog:** `lib/i18n/listing-fields.test.ts` (self)

**Category display tests** (lines 74-99):

```typescript
describe('resolveListingCategory', () => {
  it('returns category_en when locale en and column populated (D-31)', () => {
    expect(
      resolveListingCategory(
        { category: 'informatica', category_en: 'Computing', category_zh: '电脑' },
        'en',
      ),
    ).toBe('Computing');
  });

  it('returns null when category and inference both absent', () => {
    expect(resolveListingCategory({ category: null, title: 'Misc item' }, 'it')).toBeNull();
  });
});
```

Add: inference-only path via resolver (title keywords, no DB category). Add: unknown slug + inference title resolves label correctly.

---

### `lib/ugc/schemas.ts` (config/validation, request-response — extend)

**Analog:** `lib/ugc/schemas.ts` (self)

**Zod schema pattern** (lines 1-9):

```typescript
import { z } from 'zod';

export const CreateListingSchema = z.object({
  title: z.string().trim().min(1).max(500),
  photoUrl: z.string().url(),
  lat: z.number().min(45.0).max(45.7),
  lng: z.number().min(12.1).max(12.6),
  description: z.string().max(2000).optional(),
});
```

Add `postCategory: z.enum(['furniture', 'tech', 'books', 'apparel', 'kitchenware', 'others'])` — import enum values from canonical module to avoid drift (A2).

**User-scoped refine pattern** (lines 11-19):

```typescript
export function createListingSchemaForUser(userId: string) {
  return CreateListingSchema.extend({
    photoUrl: z
      .string()
      .url()
      .refine((url) => url.includes(`/ugc-photos/${userId}/`), {
        message: 'Photo must be uploaded via /api/ugc/upload',
      }),
  });
}
```

Do not accept raw category slug from client — enum only (V5 input validation).

---

### `app/api/ugc/listings/route.ts` (route, CRUD — extend)

**Analog:** `app/api/ugc/listings/route.ts` (self)

**Auth + parse pattern** (lines 17-33):

```typescript
export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createListingSchemaForUser(user.id).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
```

**Insert payload pattern** (lines 54-76 — add `category` field):

```typescript
const { error } = await supabase.from('listings').insert({
  id,
  source: 'ugc',
  external_id: id,
  title,
  photo_url: photoUrl,
  external_url: `/listing/${id}`,
  lat,
  lng,
  geom: `SRID=4326;POINT(${lng} ${lat})`,
  zone,
  status: 'active',
  posted_at: now.toISOString(),
  expires_at: expiresAt.toISOString(),
  content_hash: hash,
  owner_user_id: user.id,
  description: description ?? null,
});
```

Add: `category: mapPostCategoryToSlug(parsed.data.postCategory)` from canonical module. Map on server, never trust client slug.

**Error handling pattern** (lines 45-51, 78-80):

```typescript
  try {
    await assertCanPost(supabase, user.id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: messages.post.rateLimitPost }, { status: 429 });
    }
    throw error;
  }
// ...
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
```

---

### `components/ugc/PostForm.tsx` (component, request-response — wire only)

**Analog:** `components/ugc/PostForm.tsx` (self)

**Local PostCategory type** (lines 14-31 — replace with import from canonical module):

```typescript
type PostCategory =
  | 'furniture'
  | 'tech'
  | 'books'
  | 'apparel'
  | 'kitchenware'
  | 'others';

const POST_CATEGORIES: PostCategory[] = [
  'furniture',
  'tech',
  'books',
  'apparel',
  'kitchenware',
  'others',
];
```

UI unchanged (D-12) — only type import + JSON body field.

**Fetch JSON body pattern** (lines 185-194):

```typescript
const createRes = await fetch('/api/ugc/listings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: title.trim(),
    photoUrl,
    lat,
    lng,
    description: buildDescription(description, category, condition, messages),
  }),
});
```

Add `postCategory: category` to body. Category still embedded in description via `buildDescription` (lines 49-62) — do not remove.

**Status handling pattern** (lines 197-208):

```typescript
if (createRes.status === 401) {
  setAuthOpen(true);
  return;
}

if (createRes.status === 422) {
  setError(messages.post.pinOutsideVenice);
  return;
}
```

No new user-facing strings expected (I18N-01 partial skip).

---

### `hooks/useDistanceCenter.ts` (hook, transform — optional touch)

**Analog:** `hooks/useDistanceCenter.ts` (self)

**Filter pipeline pattern** (lines 56-82):

```typescript
/** Client-side filter pipeline: search → radius → city → categories → sort (D-29). */
export function composeFeedListings({
  listings,
  applied,
  center,
  searchQuery,
  language,
  cityLabels,
}: ComposeFeedListingsInput): {
  listings: ListingRow[];
  distanceMap: Map<string, number>;
} {
  // ...
  if (applied.categories.length > 0) {
    rows = rows.filter((listing) => matchesAnySubitoCategories(listing, applied.categories));
  }
```

`ListingRow` includes `source` — pass through implicitly once `matchesAnySubitoCategories` input extended. No hook logic change expected if filter functions accept full listing shape.

**Pipeline test** (from `hooks/useDistanceCenter.test.ts` lines 196-219):

```typescript
  it('matchesAnySubitoCategories OR filters correctly', () => {
    const furniture: ListingRow = {
      ...baseListing,
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      category: 'arredamento-casalinghi',
    };
    const electronics: ListingRow = {
      ...baseListing,
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      category: 'informatica',
    };
    const applied = {
      ...DEFAULT_FILTER_PREFS,
      categories: ['arredamento-casalinghi', 'informatica'],
    };
    const { listings } = composeFeedListings({
      listings: [furniture, electronics],
      applied,
      center: null,
      searchQuery: '',
      language: 'en',
      cityLabels,
    });
    expect(listings).toHaveLength(2);
  });
```

Run after refactor to confirm D-44 semantics preserved.

---

### `components/listings/ListPageClient.tsx` + `components/map/MapExplorer.tsx` (component, transform — optional)

**Analog:** respective self files

Both call `matchesSubitoCategory(listing, selectedCategory)` with `ListingRow` which already has `source`. Once filter input extended, no call-site changes needed beyond type compatibility.

**ListPageClient filter pattern** (lines 35-44):

```typescript
  const filteredListings = useMemo(() => {
    const visible = excludeReportedIds(listings, reportedIds);
    const query = searchQuery.trim().toLowerCase();

    return visible.filter((listing) => {
      if (!matchesSubitoCategory(listing, selectedCategory)) return false;
      if (!query) return true;
      return listing.title.toLowerCase().includes(query);
    });
  }, [listings, reportedIds, searchQuery, selectedCategory]);
```

---

### `.planning/ROADMAP.md` + `REQUIREMENTS.md` + `PROJECT.md` (config, batch)

**Analog:** none (docs-only Wave 0 per D-19–D-24)

Planner updates traceability during plan-phase Wave 0 — no code pattern to copy. Reference prior phase CONTEXT decision blocks for formatting consistency.

---

## Shared Patterns

### Catalog as Source of Truth
**Source:** `lib/admin/subito-regalo-catalog.ts` (lines 1-22)
**Apply to:** `canonical-categories.ts`, slug validation

```typescript
/** 17 verified Subito regalo category slugs with Italian labels (08-UI-SPEC). */
export const SUBITO_REGALO_CATALOG = [
  { slug: 'arredamento-casalinghi', labelIt: 'Arredamento e Casalinghi' },
  // ...
] as const;

export type SubitoRegaloSlug = (typeof SUBITO_REGALO_CATALOG)[number]['slug'];
```

Import catalog; do not duplicate the 17-slug list.

### Title Keyword Inference (unchanged fallback)
**Source:** `lib/listings/categories.ts` (lines 78-87)
**Apply to:** `canonical-categories.ts` step 3 only

```typescript
export function inferListingCategory(title: string): Exclude<ListingCategory, 'All'> | null {
  const normalized = title.toLowerCase();
  for (const category of LISTING_CATEGORIES) {
    if (category === 'All') continue;
    if (KEYWORDS[category].some((word) => normalized.includes(word))) {
      return category;
    }
  }
  return null;
}
```

Do not modify `categories.ts` (D-07).

### DB Slug Preferred Over Inference
**Source:** `lib/listings/subito-categories.ts` (lines 22-25)
**Apply to:** resolver step 1, filter matching, display helper

```typescript
/**
 * Prefer DB `listing.category` slug over title keyword inference (D-29).
 * Title inference is fallback only when category column is null.
 */
```

Extend: validate slug against catalog; unknown slug falls through to inference (D-18).

### Zod Request Validation
**Source:** `lib/ugc/schemas.ts` + `app/api/ugc/listings/route.ts`
**Apply to:** `postCategory` enum field

```typescript
const parsed = createListingSchemaForUser(user.id).safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
}
```

### Wave 0 TDD (Phase 10 pattern)
**Source:** `lib/listings/subito-categories.test.ts`, `lib/listings/card-metadata.test.ts`
**Apply to:** `canonical-categories.test.ts` first, then refactor consumers

Colocated `*.test.ts` next to module; run `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` per commit.

### Subito Scraper Already Writes Category
**Source:** `scraper/src/shared/normalize.ts` (line 42)
**Apply to:** resolver Subito path validation only — no scraper changes

Scraper sets `category: extractCategoryFromSubitoUrl(raw.external_url)`. Resolver validates against catalog.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/ROADMAP.md` | config | batch | Planning doc update only; no code analog |
| `.planning/REQUIREMENTS.md` | config | batch | Planning doc update only; no code analog |
| `.planning/PROJECT.md` | config | batch | Planning doc update only; no code analog |

---

## Metadata

**Analog search scope:** `lib/listings/`, `lib/i18n/`, `lib/ugc/`, `app/api/ugc/`, `components/ugc/`, `hooks/`, `lib/admin/`, `scraper/src/shared/`
**Files scanned:** ~25
**Pattern extraction date:** 2026-08-10
