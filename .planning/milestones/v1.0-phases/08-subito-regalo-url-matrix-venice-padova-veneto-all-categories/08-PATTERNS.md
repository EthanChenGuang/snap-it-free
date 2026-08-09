# Phase 8: Subito Regalo URL Matrix — Pattern Map

**Mapped:** 2026-08-05  
**Files analyzed:** 29 new/modified files  
**Analogs found:** 26 / 29

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/admin/url-validate.ts` | utility | request-response | `lib/admin/url-validate.ts` (self) | exact |
| `lib/admin/subito-regalo-catalog.ts` | config | transform | `lib/admin/reject-reasons.ts` | role-match |
| `lib/admin/subito-recommended-seed.ts` | config | batch | `scraper/src/subito/categories.ts` | role-match |
| `components/admin/RegaloUrlMatrix.tsx` | component | event-driven | `components/admin/MaintenanceCard.tsx` | role-match |
| `components/admin/ReplaceUrlsConfirmDialog.tsx` | component | event-driven | `components/ugc/AuthPromptModal.tsx` | role-match |
| `components/admin/SourceDetailClient.tsx` | component | event-driven | `components/admin/SourceDetailClient.tsx` (self) | exact |
| `scraper/src/subito/normalize.ts` | utility | transform | `scraper/src/subito/normalize.ts` (self) | exact |
| `scraper/src/subito/url-context.ts` | utility | transform | `scraper/src/subito/extract.ts` (`isRegaloCategoryUrl`) | role-match |
| `scraper/src/subito/extract.ts` | service | transform | `scraper/src/subito/extract.ts` (self) | exact |
| `scraper/src/subito/categories.ts` | config | batch | `scraper/src/subito/categories.ts` (self) | exact |
| `scraper/src/shared/normalize.ts` | service | transform | `scraper/src/shared/normalize.ts` (self) | exact |
| `scraper/src/shared/schema.ts` | model | validation | `scraper/src/shared/schema.ts` (self) | exact |
| `scraper/src/shared/persist.ts` | service | CRUD | `scraper/src/shared/persist.ts` (self) | exact |
| `supabase/migrations/020_subito_location_category.sql` | migration | CRUD | `supabase/migrations/007_ugc_messaging_reports.sql` | role-match |
| `lib/listings/filters.ts` | utility | transform | `lib/listings/filters.ts` (self) | exact |
| `lib/listings/queries.ts` | service | CRUD | `lib/listings/queries.ts` (self) | exact |
| `lib/listings/client-queries.ts` | service | CRUD | `lib/listings/client-queries.ts` (self) | exact |
| `lib/listings/types.ts` | model | — | `lib/listings/types.ts` (self) | exact |
| `lib/listings/subito-categories.ts` | utility | transform | `lib/listings/categories.ts` | role-match |
| `lib/listings/categories.ts` | utility | transform | `lib/listings/categories.ts` (self) | exact |
| `lib/i18n/listing-fields.ts` | utility | transform | `lib/i18n/listing-fields.ts` (self) | exact |
| `components/listings/SubitoCategoryFilterChips.tsx` | component | event-driven | `components/listings/CategoryFilterChips.tsx` | exact |
| `components/listings/ListPageClient.tsx` | component | event-driven | `components/listings/ListPageClient.tsx` (self) | exact |
| `components/listings/ListListingCard.tsx` | component | request-response | `components/listings/ListListingCard.tsx` (self) | exact |
| `components/listings/ListingCard.tsx` | component | request-response | `components/listings/ListingCard.tsx` (self) | exact |
| `components/map/FloatingMapSearch.tsx` | component | event-driven | `components/map/FloatingMapSearch.tsx` (self) | exact |
| `components/map/MapExplorer.tsx` | component | event-driven | `components/map/MapExplorer.tsx` (self) | exact |
| `scraper/scripts/spike-subito-padova.mjs` | test | file-I/O | `scraper/scripts/spike-subito-geo.mjs` | exact |
| `lib/admin/url-validate.test.ts` | test | — | `lib/admin/url-validate.test.ts` (self) | exact |
| `lib/listings/filters.test.ts` | test | — | `lib/listings/filters.test.ts` (self) | exact |

---

## Pattern Assignments

### `lib/admin/url-validate.ts` (utility, request-response)

**Analog:** `lib/admin/url-validate.ts`

**Imports pattern** (lines 1–7):

```typescript
const HOST_ALLOWLIST: Record<string, RegExp> = {
  subito: /(^|\.)subito\.it$/i,
  facebook: /(^|\.)facebook\.com$/i,
  // ...
};
```

**Core validation pattern** (lines 14–38):

```typescript
export function validateTargetUrl(
  url: string,
  slug: string,
): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'HTTPS required' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostMatchesSlug(hostname, slug)) {
    return { ok: false, error: `Host not allowed for ${slug}` };
  }

  if (slug === 'subito' && !parsed.pathname.includes('venezia')) {
    return { ok: false, error: 'Subito URLs must be Venice-scoped (venezia path)' };
  }

  return { ok: true };
}
```

**Batch wrapper** (lines 41–57):

```typescript
export function validateTargetUrls(
  slug: string,
  urls: string[],
): { ok: true } | { ok: false; error: string } {
  if (urls.length === 0) {
    return { ok: false, error: 'At least one URL is required' };
  }
  for (const url of urls) {
    const result = validateTargetUrl(url, slug);
    if (!result.ok) return result;
  }
  return { ok: true };
}
```

**Phase 8 change:** Replace Venice-only check (lines 34–36) with regex  
`/^\/annunci-veneto\/regalo\/[^/]+\/(venezia|padova)\/(venezia|padova)\/?$/i`.  
PATCH route already calls `validateTargetUrls` — no route change needed (`app/api/admin/sources/[slug]/route.ts` lines 69–74).

---

### `lib/admin/subito-regalo-catalog.ts` (config, transform)

**Analog:** `lib/admin/reject-reasons.ts` + `scraper/src/subito/categories.ts`

**Constant catalog pattern** (from `lib/admin/reject-reasons.ts` lines 3–10):

```typescript
const REASON_FILTERS = [
  { value: '', label: rejectsMessages.filterAllReasons },
  { value: 'outside venice', label: rejectsMessages.reasonOutsideVenice },
  // ...
] as const;

export { REASON_FILTERS };
```

**URL constant pattern** (from `scraper/src/subito/categories.ts` lines 1–7):

```typescript
export const SUBITO_CATEGORY_URLS = [
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
  'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/venezia/venezia/',
  'https://www.subito.it/annunci-veneto/regalo/bambini-giocattoli/venezia/venezia/',
] as const;
```

**New module should export:**
- `SUBITO_REGALO_CATALOG` — `{ slug, labelIt }[]` × 17 (labels from `08-UI-SPEC.md` catalog table)
- `buildRegaloCategoryUrl(region, slug, city)` — single URL builder
- `parseRegaloCategoryUrl(url)` — reverse parse for validation/tests
- `dedupeUrls(urls: string[])` — `[...new Set(urls.map(u => u.trim()).filter(Boolean))]`
- `generateRegaloUrls(cities, slugs)` — cartesian product for matrix Generate

---

### `lib/admin/subito-recommended-seed.ts` (config, batch)

**Analog:** `scraper/src/subito/categories.ts`

**Pattern** (lines 1–7):

```typescript
// Target: Venice comune-scoped regalo categories (confirmed 2026-08-03 recon).
// Form: /annunci-veneto/regalo/{category}/venezia/venezia/ — no ?o= pagination
export const SUBITO_CATEGORY_URLS = [
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
  // ...
] as const;
```

**New module:** Import `buildRegaloCategoryUrl` + full catalog; export `RECOMMENDED_SUBITO_SEED_URLS` (34 URLs).  
Gate Padova half behind spike PASS per D-15 — split `VENEZIA_URLS` / `PADOVA_URLS` constants.

---

### `components/admin/RegaloUrlMatrix.tsx` (component, event-driven)

**Analog:** `components/admin/MaintenanceCard.tsx` + `components/admin/SourceDetailClient.tsx`

**Admin subcomponent state pattern** (from `MaintenanceCard.tsx` lines 15–20):

```typescript
export function MaintenanceCard({ initialPreview }: MaintenanceCardProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<CleanupPreview | null>(initialPreview);
  const [loading, setLoading] = useState<'preview' | 'execute' | null>(null);
  const [error, setError] = useState<string | null>(null);
```

**Form subsection styling** (from `SourceDetailClient.tsx` lines 176–242):

```typescript
<div className="space-y-5 rounded border border-outline-variant bg-surface p-5 text-[15px]">
  <div className="space-y-2 border-b border-outline-variant pb-4">
    <label className="block font-semibold">{sourcesMessages.urlsLabel}</label>
    <textarea
      rows={5}
      value={targetUrlsText}
      onChange={(event) => setTargetUrlsText(event.target.value)}
      className="max-h-48 w-full overflow-y-auto rounded border border-outline-variant bg-surface-container-low p-3 font-mono text-[14px] leading-relaxed focus:border-primary focus:outline-none"
    />
  </div>
</div>
```

**Matrix panel:** Insert as bordered subsection **above** textarea; props:  
`targetUrlsText`, `onTargetUrlsChange`, optional `onMatrixStateChange`.  
Use checkbox grid (`grid grid-cols-1 md:grid-cols-2`), warning banner at ≥30 URLs (`bg-[#f1f1f0] text-amber-700`), Italian category labels with `title={slug}`.

**Generate merge (D-05):** Generated URLs first, then unique manual lines not in generated set; call `dedupeUrls` from catalog module.

---

### `components/admin/ReplaceUrlsConfirmDialog.tsx` (component, event-driven)

**Analog:** `components/ugc/AuthPromptModal.tsx` + `components/ui/dialog.tsx`

**Controlled dialog pattern** (from `AuthPromptModal.tsx` lines 15–17, 68–73):

```typescript
type AuthPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // ...
};

export function AuthPromptModal({ open, onOpenChange, ... }: AuthPromptModalProps) {
```

**Dialog primitives** (from `components/ui/dialog.tsx` lines 27–45):

```typescript
const DialogContent = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded border border-outline-variant bg-surface p-space-lg shadow-none',
        // ...
      )}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
```

**Props:** `open`, `onOpenChange`, `currentCount`, `onConfirm`.  
Use Stitch overlay `bg-[#1a1c1c]/40 backdrop-blur-sm` per UI-SPEC.  
Primary confirm = `bg-primary text-on-primary`; dismiss = outline border.

---

### `components/admin/SourceDetailClient.tsx` (component, event-driven)

**Analog:** `components/admin/SourceDetailClient.tsx`

**Save + URL parse pattern** (lines 58–82):

```typescript
const handleSave = async () => {
  setError(null);
  setSuccess(false);
  // ...
  const urls = targetUrlsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  setSaving(true);
  try {
    const response = await fetch(`/api/admin/sources/${initialSource.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        interval_minutes: interval,
        anti_block_preset: antiBlock,
        target_urls: urls,
      }),
    });
```

**Integration point** (lines 230–242 — insert matrix **above** this block):

```typescript
<div className="space-y-2 border-b border-outline-variant pb-4">
  <div className="flex items-center justify-between gap-2">
    <label className="block font-semibold">{sourcesMessages.urlsLabel}</label>
    ...
  </div>
  <textarea ... />
</div>
```

**Phase 8 changes:**
1. Import `RegaloUrlMatrix`; render above textarea when `initialSource.slug === 'subito'`
2. Dedupe URLs in `handleSave` before PATCH (D-06) via `dedupeUrls`
3. Wire seed confirm modal state (`showSeedConfirm`, `currentUrlCount`)

---

### `scraper/src/subito/normalize.ts` (utility, transform)

**Analog:** `scraper/src/subito/normalize.ts`

**Current broken parser** (lines 1–13):

```typescript
export function extractCategoryFromSubitoUrl(externalUrl: string): string | null {
  try {
    const { pathname } = new URL(externalUrl);
    const match = pathname.match(/\/regalo\/([^/]+)/i);
    if (!match?.[1]) {
      return null;
    }
    return match[1].replace(/-/g, ' ');
  } catch {
    return null;
  }
}
```

**Fix pattern:** Detail URLs = `/{category}/{listing-slug}.htm` — read first path segment; keep `/regalo/` fallback for category listing URLs.  
Return slug as-is (no hyphen→space); Italian label comes from catalog map at display/translate time (D-17).

---

### `scraper/src/subito/url-context.ts` (utility, transform)

**Analog:** `scraper/src/subito/extract.ts` (`isRegaloCategoryUrl`)

**URL shape detection** (extract.ts lines 57–66):

```typescript
export function isRegaloCategoryUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return /\/annunci-[^/]+\/regalo\/[^/]+\/?/i.test(pathname) && !pathname.includes('.htm');
  } catch {
    return false;
  }
}
```

**New module:** `parseRegaloCategoryUrl(url)` with regex  
`/^\/annunci-([^/]+)\/regalo\/([^/]+)\/([^/]+)\/\3\/?$/i` → `{ region, categorySlug, city }`.  
Used by normalize/persist to set `city`/`region` from scrape context URL.

---

### `scraper/src/subito/extract.ts` (service, transform)

**Analog:** `scraper/src/subito/extract.ts`

**Bbox constants** (lines 46–49, 98–107):

```typescript
const VENICE_LAT_MIN = 45.0;
const VENICE_LAT_MAX = 45.7;
const VENICE_LNG_MIN = 12.1;
const VENICE_LNG_MAX = 12.6;

function inVeniceBbox(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VENICE_LAT_MIN &&
    lat <= VENICE_LAT_MAX &&
    lng >= VENICE_LNG_MIN &&
    lng <= VENICE_LNG_MAX
  );
}
```

**Coord gate in resolveCoords** (lines 225–230):

```typescript
for (const { source, hit } of embedded) {
  if (!hit) continue;
  if (!inVeniceBbox(hit.lat, hit.lng)) {
    return { lat: null, lng: null, source: 'out-of-bbox' };
  }
  return { lat: hit.lat, lng: hit.lng, source };
}
```

**Phase 8 changes:**
1. Add `PADOVA_*` bbox constants (from spike)
2. Replace `inVeniceBbox` with `inCityBbox(lat, lng, city)` keyed on parsed city from `sourceCategoryUrl`
3. Extend `RawListing` with optional `source_category_url: string`
4. Pass category page URL from crawler into each extracted listing

**RawListing type** (lines 6–15):

```typescript
export type RawListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  description?: string;
};
```

---

### `scraper/src/shared/normalize.ts` (service, transform)

**Analog:** `scraper/src/shared/normalize.ts`

**Category + zone pipeline** (lines 12–42):

```typescript
export function normalizeRawListing(raw: RawListing): NormalizeResult {
  const rejectReason = isMislabeledFree(raw.title, raw.description);
  if (rejectReason) return { reject: rejectReason };

  const zone =
    raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng, zonePolygons) : null;

  const candidate = {
    source: 'subito' as const,
    // ...
    category: extractCategoryFromSubitoUrl(raw.external_url),
    raw_payload: { description: raw.description },
  };

  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}
```

**Phase 8:** Add `city`/`region` from `parseRegaloCategoryUrl(raw.source_category_url)`;  
Padova stays `zone = null` (no Venice polygon tagging).

---

### `scraper/src/shared/schema.ts` (model, validation)

**Analog:** `scraper/src/shared/schema.ts`

**Current geo bounds** (lines 6–21):

```typescript
export const CanonicalListingSchema = z.object({
  source: ListingSource,
  external_id: z.string().min(1),
  // ...
  lat: z.number().min(45.0).max(45.7).nullable(),
  lng: z.number().min(12.1).max(12.6).nullable(),
  zone: VeniceZone.nullable(),
  // ...
  category: z.string().nullable().optional(),
});
```

**Phase 8:** Add optional `city: z.string().nullable().optional()`, `region: z.string().nullable().optional()`.  
Relax lat/lng to city-keyed refinement (Venice bounds OR Padova bounds) — use `.superRefine` keyed on `city`.

---

### `scraper/src/shared/persist.ts` (service, CRUD)

**Analog:** `scraper/src/shared/persist.ts`

**Insert row shape** (lines 62–80):

```typescript
const row = {
  source: listing.source,
  external_id: listing.external_id,
  title: listing.title,
  photo_url: listing.photo_url,
  external_url: listing.external_url,
  lat: listing.lat,
  lng: listing.lng,
  zone: listing.zone,
  status: listing.status,
  posted_at: listing.posted_at.toISOString(),
  expires_at: listing.expires_at.toISOString(),
  content_hash: listing.content_hash,
  category: listing.category ?? null,
  raw_payload: listing.raw_payload ?? null,
  geom:
    listing.lat != null && listing.lng != null
      ? `SRID=4326;POINT(${listing.lng} ${listing.lat})`
      : null,
};
```

**Phase 8:** Add `city: listing.city ?? null`, `region: listing.region ?? null` to insert/update row.  
Translation already handles `category` via `translateAfterPersist` (`scraper/src/translate/ingest.ts`).

---

### `supabase/migrations/020_subito_location_category.sql` (migration)

**Analog:** `supabase/migrations/007_ugc_messaging_reports.sql` + `018_scraper_admin.sql`

**Column add pattern** (from `018_scraper_admin.sql` lines 149–156):

```sql
alter table public.listings
  add column if not exists title_en text,
  add column if not exists title_zh text,
  -- ...
  add column if not exists category text,
  add column if not exists category_en text,
  add column if not exists category_zh text;
```

**View rewrite pattern** (from `007_ugc_messaging_reports.sql` lines 108–128):

```sql
create or replace view public.listings_public
with (security_invoker = true)
as
select
  id, source, title, photo_url, external_url, lat, lng, zone,
  posted_at, expires_at, status
from public.listings
where (
  (status = 'active' and expires_at > now())
  or (status = 'claimed' and source = 'ugc' and expires_at > now())
)
and zone is not null;
```

**Phase 8 migration must:**
1. `alter table listings add column city text, add column region text`
2. Add partial indexes on `city`, `category` where `status = 'active'`
3. Recreate `listings_public` with new columns + D-28 visibility:  
   `zone is not null OR (city is not null AND lat is not null AND lng is not null)`
4. Re-apply `security_invoker = false` per `010_listings_public_security_definer.sql`

---

### `lib/listings/filters.ts` (utility, transform)

**Analog:** `lib/listings/filters.ts`

**Current filterByZone** (lines 3–9):

```typescript
export function filterByZone(listings: ListingRow[], zoneChip: ZoneChip): ListingRow[] {
  if (zoneChip === 'All') {
    return listings.filter((listing) => listing.zone != null);
  }
  return listings.filter((listing) => listing.zone === zoneChip);
}
```

**Phase 8 D-22:** `'All'` includes `zone != null OR (zone == null && lat != null && lng != null)`.  
Venice-specific chips unchanged — still `listing.zone === zoneChip`.

**Map filter** (lines 11–13) — unchanged:

```typescript
export function filterMapListings(listings: ListingRow[]): ListingRow[] {
  return listings.filter((listing) => listing.lat != null && listing.lng != null);
}
```

---

### `lib/listings/queries.ts` + `client-queries.ts` (service, CRUD)

**Analog:** `lib/listings/queries.ts`

**Column select + zone filter** (queries.ts lines 8–24):

```typescript
const ACTIVE_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at, status';

export async function getActiveListings(): Promise<ListingRow[]> {
  // ...
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false });
```

**Phase 8:**
1. Extend `ACTIVE_LISTING_COLUMNS` with `city, region, category, category_en, category_zh, title_en, title_zh`
2. **Remove** `.not('zone', 'is', null)` — view handles visibility (D-28)
3. Mirror changes in `client-queries.ts` lines 7–15 (`activeListingQuery`)

---

### `lib/listings/types.ts` (model)

**Analog:** `lib/listings/types.ts`

**ListingRow pattern** (lines 5–22):

```typescript
export type ListingRow = {
  id: string;
  source: ListingSource;
  title: string;
  title_en?: string | null;
  title_zh?: string | null;
  // ...
  zone: VeniceZone | null;
  posted_at: string;
  expires_at: string;
  status: ListingStatus;
};
```

**Add:** `city?: string | null`, `region?: string | null`, `category?: string | null`, `category_en?: string | null`, `category_zh?: string | null`.

---

### `lib/listings/subito-categories.ts` (utility, transform)

**Analog:** `lib/listings/categories.ts`

**Inference fallback pattern** (categories.ts lines 78–95):

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

export function matchesListingCategory(title: string, selected: ListingCategory): boolean {
  if (selected === 'All') return true;
  return inferListingCategory(title) === selected;
}
```

**New module:** Import `SUBITO_REGALO_CATALOG` from admin catalog; export:
- `getSubitoCategoryLabel(slug, locale)` — Italian default; `category_en`/`category_zh` when locale ≠ it
- `matchesSubitoCategory(listing, selectedSlug | 'all')` — DB `listing.category` primary; title inference fallback only (D-29)

---

### `lib/i18n/listing-fields.ts` (utility, transform)

**Analog:** `lib/i18n/listing-fields.ts`

**Locale resolver pattern** (lines 22–30):

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

**Add:** `resolveListingCategory(row, locale)` — parallel fallback:  
`category_en ?? category` / `category_zh ?? category` / Italian slug→label from catalog.

---

### `components/listings/SubitoCategoryFilterChips.tsx` (component, event-driven)

**Analog:** `components/listings/CategoryFilterChips.tsx`

**Chip row pattern** (lines 14–40):

```typescript
export function CategoryFilterChips({
  selectedCategory,
  onCategoryChange,
  className,
}: CategoryFilterChipsProps) {
  const { categoryLabel } = useMessages();

  return (
    <div className={cn('flex gap-space-sm overflow-x-auto no-scrollbar pb-space-xs', className)}>
      {LISTING_CATEGORIES.map((category) => {
        const isActive = selectedCategory === category;
        return (
          <Button
            key={category}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className="shrink-0 whitespace-nowrap rounded-full px-space-md py-1.5"
            onClick={() => onCategoryChange(category)}
          >
            {categoryLabel(category)}
          </Button>
        );
      })}
    </div>
  );
}
```

**New component:** 18 chips (`Tutte` + 17 slugs); labels from `getSubitoCategoryLabel`;  
type `selectedCategory: SubitoCategorySlug | 'all'`. Shared by map + Elenco.

---

### `components/listings/ListPageClient.tsx` (component, event-driven)

**Analog:** `components/listings/ListPageClient.tsx`

**Filter pipeline** (lines 35–44):

```typescript
const filteredListings = useMemo(() => {
  const visible = excludeReportedIds(listings, reportedIds);
  const query = searchQuery.trim().toLowerCase();

  return visible.filter((listing) => {
    if (!matchesListingCategory(listing.title, selectedCategory)) return false;
    if (!query) return true;
    return listing.title.toLowerCase().includes(query);
  });
}, [listings, reportedIds, searchQuery, selectedCategory]);
```

**Phase 8:** Replace `CategoryFilterChips` with `SubitoCategoryFilterChips`;  
use `matchesSubitoCategory(listing, selectedCategory)` instead of title inference.

---

### `components/listings/ListListingCard.tsx` (component, request-response)

**Analog:** `components/listings/ListListingCard.tsx`

**Current category badge (inference)** (lines 24, 73–77):

```typescript
const inferredCategory = inferListingCategory(listing.title);
// ...
{inferredCategory && (
  <span className="rounded-sm border border-outline-variant bg-surface px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider">
    {categoryLabel(inferredCategory)}
  </span>
)}
```

**Location line** (lines 22, 81–84):

```typescript
const zoneText = listing.zone ? zoneLabel(listing.zone) : messages.listing.approximateZone;
// ...
<span className="truncate">{zoneText}</span>
```

**Phase 8:** Badge from `resolveListingCategory(listing, language)` when `listing.category` set;  
location = `zoneLabel(zone)` if zone else capitalize `city` (e.g. "Padova") per D-27.

---

### `components/listings/ListingCard.tsx` (component, request-response)

**Analog:** `components/listings/ListingCard.tsx`

**Location line** (lines 30, 72–74):

```typescript
const zoneText = listing.zone ? zoneLabel(listing.zone) : messages.listing.approximateZone;
// ...
<p className="text-label-sm uppercase tracking-wider text-secondary">
  {zoneText}
</p>
```

**Phase 8:** Add category badge chip; location = zone OR city uppercase (D-27);  
Padova badge uses `bg-surface-container-high` per UI-SPEC.

---

### `components/map/FloatingMapSearch.tsx` (component, event-driven)

**Analog:** `components/map/FloatingMapSearch.tsx`

**Layout** (lines 24–39):

```typescript
<div className="pointer-events-auto absolute left-1/2 top-space-md z-40 flex w-full max-w-md -translate-x-1/2 flex-col gap-space-sm px-gutter">
  <div className="flex items-center rounded-lg border border-outline bg-surface px-space-md py-space-sm">
    {/* search input */}
  </div>
  <ZoneFilterChips selectedZone={selectedZone} onZoneChange={onZoneChange} />
</div>
```

**Phase 8:** Wrap in `flex flex-col gap-space-md`; add Row 2 category panel with  
`SubitoCategoryFilterChips`; panel wrapper `bg-surface/80 backdrop-blur-md border rounded-xl p-space-sm`.

---

### `components/map/MapExplorer.tsx` (component, event-driven)

**Analog:** `components/map/MapExplorer.tsx`

**Filter pipeline** (lines 38–48):

```typescript
const filteredListings = useMemo(() => {
  const byZone = excludeReportedIds(filterByZone(listings, selectedZone), reportedIds);
  const trimmed = query.trim();
  if (!trimmed) return byZone;
  const needle = trimmed.toLowerCase();
  return byZone.filter((listing) => listing.title.toLowerCase().includes(needle));
}, [listings, selectedZone, reportedIds, query]);

const mapListings = useMemo(
  () => filterMapListings(filteredListings),
  [filteredListings],
);
```

**Phase 8:** Add `selectedCategory` state; AND `matchesSubitoCategory` after zone filter;  
pass category props to `FloatingMapSearch`.

---

### `scraper/scripts/spike-subito-padova.mjs` (test, file-I/O)

**Analog:** `scraper/scripts/spike-subito-geo.mjs`

**Script header + Playwright setup** (lines 1–13, 72–79):

```javascript
// Run: cd scraper && node --import tsx scripts/spike-subito-geo.mjs
import { chromium } from 'playwright';

async function dismissCookieBanner(page) {
  const accept = page.locator('#didomi-notice-agree-button, button:has-text("Accetta")');
  if ((await accept.count()) > 0) {
    await accept.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}
```

**Padova spike:** Test 2–3 slugs at `/annunci-veneto/regalo/{slug}/padova/padova/`;  
record HTTP success, article count, sample detail coords with proposed Padova bbox.

---

## Shared Patterns

### Admin PATCH + URL validation

**Source:** `app/api/admin/sources/[slug]/route.ts` lines 69–74  
**Apply to:** Save flow only — extend `validateTargetUrls`, no route schema change

```typescript
if (parsed.data.target_urls != null) {
  const urlCheck = validateTargetUrls(slug, parsed.data.target_urls);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }
}
```

### Consumer chip filter UI

**Source:** `components/listings/CategoryFilterChips.tsx` + `components/map/ZoneFilterChips.tsx`  
**Apply to:** `SubitoCategoryFilterChips.tsx`, map + Elenco

```typescript
<Button
  variant={isActive ? 'chipActive' : 'chip'}
  size="sm"
  className="shrink-0 whitespace-nowrap"
  onClick={() => onChange(value)}
>
  {label}
</Button>
```

### i18n field resolution

**Source:** `lib/i18n/listing-fields.ts`  
**Apply to:** Category badges and chip labels (D-31)

```typescript
function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
// en → *_en ?? original; zh → *_zh ?? original; it → original
```

### Scraper ingest pipeline

**Source:** `scraper/src/shared/normalize.ts` → `persist.ts` → `translate/ingest.ts`  
**Apply to:** city/region/category columns

```
RawListing (+ source_category_url)
  → normalizeRawListing (category, city, region, zone)
  → CanonicalListingSchema.parse
  → persistListing (insert row)
  → translateAfterPersist (category_en, category_zh)
```

### Triple zone visibility alignment (D-28/D-22)

**Must change together:**
1. `listings_public` view predicate
2. Remove `.not('zone', 'is', null)` in `queries.ts` + `client-queries.ts`
3. `filterByZone('All')` in `filters.ts`

### Stitch admin form styling

**Source:** `components/admin/SourceDetailClient.tsx`  
**Apply to:** RegaloUrlMatrix subsection

- `rounded border border-outline-variant bg-surface`
- Inner panel: `bg-surface-container-low border rounded p-space-md`
- Monospace textarea: `font-mono text-[14px]`
- Primary CTA: `bg-primary text-on-primary`
- Warning: `bg-[#f1f1f0] text-amber-700` (not bright yellow)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scraper/src/subito/url-context.ts` | utility | transform | No URL context parser exists; closest is `isRegaloCategoryUrl` — use RESEARCH.md regex pattern |
| `lib/admin/subito-regalo-catalog.test.ts` | test | — | New test file; follow `lib/admin/url-validate.test.ts` structure |
| `scraper/src/subito/normalize.test.ts` | test | — | New test file; follow `lib/listings/filters.test.ts` Vitest describe/it pattern |

---

## Metadata

**Analog search scope:** `lib/admin/`, `components/admin/`, `components/listings/`, `components/map/`, `lib/listings/`, `lib/i18n/`, `scraper/src/subito/`, `scraper/src/shared/`, `scraper/scripts/`, `supabase/migrations/`, `components/ui/`, `components/ugc/`  
**Files scanned:** ~45  
**Pattern extraction date:** 2026-08-05
