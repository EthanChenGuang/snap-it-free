# Phase 03: UGC Posting & Community Marketplace - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 42
**Analogs found:** 34 / 42

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/007_ugc_messaging_reports.sql` | migration | CRUD | `supabase/migrations/002_listings_schema.sql` + `004_listings_public_read_rls.sql` | role-match |
| `lib/supabase/server.ts` | config | request-response | self (fix `setAll`) | exact |
| `lib/supabase/admin.ts` | config | request-response | `scraper/src/config.ts` | role-match |
| `lib/supabase/auth.ts` | utility | request-response | — | none |
| `app/auth/callback/route.ts` | route | request-response | — | none |
| `lib/geo/zone-tag.ts` | utility | transform | `scraper/src/shared/zone-tag.ts` | exact |
| `lib/geo/geojson/*.geojson` | config | file-I/O | `scraper/src/geo/*.geojson` | exact |
| `lib/geo/zone-tag.test.ts` | test | transform | `scraper/src/shared/zone-tag.test.ts` | exact |
| `lib/ugc/schemas.ts` | model | transform | `lib/listings/schema.ts` | role-match |
| `lib/ugc/rate-limit.ts` | utility | CRUD | — | none |
| `lib/ugc/exif-strip.ts` | utility | file-I/O | — | none |
| `lib/messages/schemas.ts` | model | transform | `lib/listings/schema.ts` | role-match |
| `lib/reports/schemas.ts` | model | transform | `lib/listings/schema.ts` | role-match |
| `lib/reports/auto-hide.ts` | service | CRUD | `scraper/src/shared/persist.ts` | role-match |
| `lib/listings/queries.ts` | service | CRUD | self (extend) | exact |
| `lib/listings/types.ts` | model | CRUD | self (extend) | exact |
| `lib/listings/schema.ts` | model | transform | self (extend) | exact |
| `messages/it.ts` | config | — | self (extend) | exact |
| `app/api/ugc/upload/route.ts` | route | file-I/O | — (RESEARCH Pattern 2) | none |
| `app/api/ugc/listings/route.ts` | route | CRUD | `scraper/src/shared/persist.ts` | role-match |
| `app/api/ugc/listings/[id]/route.ts` | route | CRUD | `scraper/src/shared/persist.ts` | role-match |
| `app/api/messages/conversations/route.ts` | route | CRUD | `scraper/src/shared/persist.ts` | role-match |
| `app/api/messages/conversations/[id]/messages/route.ts` | route | request-response | `lib/listings/useListingsPoll.ts` (poll) | partial |
| `app/api/reports/route.ts` | route | CRUD | `scraper/src/shared/persist.ts` | role-match |
| `app/post/page.tsx` | component | request-response | `app/post/page.tsx` + `app/settings/page.tsx` | exact |
| `app/post/manage/page.tsx` | component | CRUD | `app/settings/page.tsx` | role-match |
| `app/listing/[id]/page.tsx` | route | request-response | self (branch on `source`) | exact |
| `components/ugc/PostForm.tsx` | component | file-I/O | `src/components/PostItemView.tsx` | role-match |
| `components/ugc/StreetDumpForm.tsx` | component | file-I/O | `PostForm` + `components/map/MapExplorer.tsx` | partial |
| `components/ugc/AuthPromptModal.tsx` | component | request-response | `components/ui/drawer.tsx` + `lib/supabase/client.ts` | partial |
| `components/ugc/PinMap.tsx` | component | transform | `components/map/ListingMap.tsx` | role-match |
| `components/detail/UgcListingShell.tsx` | component | request-response | `components/detail/ScrapedListingShell.tsx` | exact |
| `components/messages/DmDrawer.tsx` | component | request-response | `src/components/ChatModal.tsx` + `components/ui/drawer.tsx` | role-match |
| `components/messages/SafetyModal.tsx` | component | event-driven | `components/ui/button.tsx` (Stitch modal) | partial |
| `components/messages/SafetyBanner.tsx` | component | event-driven | `components/detail/ScrapedListingShell.tsx` (banner section) | partial |
| `components/listings/ListingCard.tsx` | component | CRUD | self (extend badges) | exact |
| `components/detail/HeroMetadata.tsx` | component | CRUD | self (extend source/status badges) | exact |
| `lib/ugc/schemas.test.ts` | test | transform | `lib/listings/filters.test.ts` | role-match |
| `lib/ugc/exif-strip.test.ts` | test | file-I/O | `scraper/src/shared/zone-tag.test.ts` | role-match |
| `lib/ugc/rate-limit.test.ts` | test | CRUD | `lib/listings/queries.test.ts` | role-match |
| `lib/messages/schemas.test.ts` | test | transform | `lib/listings/filters.test.ts` | role-match |
| `lib/reports/auto-hide.test.ts` | test | CRUD | `lib/listings/filters.test.ts` | role-match |
| `lib/reports/schemas.test.ts` | test | transform | `lib/listings/filters.test.ts` | role-match |

---

## Pattern Assignments

### `supabase/migrations/007_ugc_messaging_reports.sql` (migration, CRUD)

**Analog:** `supabase/migrations/002_listings_schema.sql`, `004_listings_public_read_rls.sql`, `006_listings_public_view.sql`

**Enum/table extension pattern** (from `002_listings_schema.sql` lines 1-23):

```sql
create type listing_source as enum ('subito', 'facebook', 'ugc');
create type listing_status as enum ('active', 'claimed', 'expired', 'hidden');
create type venice_zone as enum ('centro_storico', 'mestre_marghera', 'lido_murano');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  source listing_source not null,
  ...
  unique (source, external_id)
);
```

**RLS enable + policy pattern** (from `004_listings_public_read_rls.sql` lines 4-16):

```sql
alter table public.listings enable row level security;

create policy "public_read_active_non_expired"
on public.listings
for select
to anon, authenticated
using (
  status = 'active'
  and expires_at > now()
);
```

**View replace pattern** (from `006_listings_public_view.sql` lines 4-20 — extend for D-69 claimed UGC):

```sql
create or replace view public.listings_public
with (security_invoker = true)
as
select
  id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at
from public.listings
where status = 'active'
  and expires_at > now();
```

**Planner note:** Migration 007 adds columns (`owner_user_id`, `description`, `reserved_at`, `report_count`, `hidden_reason`), new tables (`conversations`, `messages`, `listing_reports`), UGC write RLS, and replaces `listings_public` to include `status` + claimed UGC rows per RESEARCH Pattern 3.

---

### `lib/supabase/server.ts` (config, request-response)

**Analog:** self — fix no-op `setAll` per RESEARCH Pattern 1

**Current broken pattern** (lines 5-14):

```typescript
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
}
```

**Fix pattern** (from RESEARCH — implement before any auth):

```typescript
setAll: (cookiesToSet) => {
  cookiesToSet.forEach(({ name, value, options }) =>
    cookieStore.set(name, value, options),
  );
},
```

**Env guard pattern** (from `lib/supabase/env.ts` lines 1-26):

```typescript
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  ...
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = getSupabaseEnv();
  if (!env) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return env;
}
```

---

### `lib/supabase/admin.ts` (config, request-response)

**Analog:** `scraper/src/config.ts`

**Service-role client pattern** (lines 4-16):

```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const supabaseAdmin: SupabaseClient = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

**Planner note:** Use admin client **server-only** for report counter increment if RLS blocks cross-owner UPDATE; never expose to browser (D-86).

---

### `lib/supabase/auth.ts` (utility, request-response)

**Analog:** none — use RESEARCH Pattern 1 + Route Handler auth gate

**Auth gate pattern** (compose from `lib/supabase/server.ts` + RESEARCH):

```typescript
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null as const };
  }
  return { supabase, user };
}
```

Apply in every `app/api/*` Route Handler before mutations.

---

### `app/auth/callback/route.ts` (route, request-response)

**Analog:** none — first App Router route handler in project

**Fallback:** RESEARCH Pattern 1 — `exchangeCodeForSession(code)` then redirect to `next` param.

**Page params pattern** (from `app/listing/[id]/page.tsx` lines 8-13):

```typescript
type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
```

Use `NextResponse.redirect` after session exchange; read `next` from searchParams.

---

### `lib/geo/zone-tag.ts` + `lib/geo/geojson/` (utility, transform)

**Analog:** `scraper/src/shared/zone-tag.ts` (exact port)

**Imports pattern** (lines 1-6):

```typescript
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { VeniceZoneType } from './schema.js';
```

**Core tagging pattern** (lines 31-52):

```typescript
export function loadZonePolygons(): ZonePolygon[] {
  if (!cachedZones) {
    cachedZones = [
      polygonFromCollection(readGeoJson('centro-storico.geojson'), 'centro_storico'),
      polygonFromCollection(readGeoJson('mestre-marghera.geojson'), 'mestre_marghera'),
      polygonFromCollection(readGeoJson('lido-murano.geojson'), 'lido_murano'),
    ];
  }
  return cachedZones;
}

export function tagZone(lat: number, lng: number, zones: ZonePolygon[]): VeniceZoneType | null {
  const pt: Feature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {},
  };
  for (const z of zones) {
    if (booleanPointInPolygon(pt, z.polygon)) return z.id;
  }
  return null;
}
```

**Planner note:** Copy GeoJSON into `lib/geo/geojson/`; import `VeniceZone` from `@/lib/listings/types` instead of scraper schema. Port test from `scraper/src/shared/zone-tag.test.ts` verbatim with same coordinate assertions.

---

### `lib/ugc/schemas.ts`, `lib/messages/schemas.ts`, `lib/reports/schemas.ts` (model, transform)

**Analog:** `lib/listings/schema.ts`

**Zod enum + object pattern** (lines 1-19):

```typescript
import { z } from 'zod';

export const ListingSourceSchema = z.enum(['subito', 'facebook', 'ugc']);
export const VeniceZoneSchema = z.enum(['centro_storico', 'mestre_marghera', 'lido_murano']);

export const ListingReadSchema = z.object({
  id: z.string().uuid(),
  source: ListingSourceSchema,
  title: z.string().min(1).max(500),
  ...
});

export type ListingRead = z.infer<typeof ListingReadSchema>;
```

**Scraper bounds reference** (from `scraper/src/shared/schema.ts` lines 6-19):

```typescript
export const CanonicalListingSchema = z.object({
  lat: z.number().min(45.0).max(45.7).nullable(),
  lng: z.number().min(12.1).max(12.6).nullable(),
  ...
});
```

Use `.parse()` in Route Handlers; return 400 on `ZodError`.

---

### `lib/ugc/rate-limit.ts` + `lib/reports/auto-hide.ts` (service/utility, CRUD)

**Analog:** `scraper/src/shared/persist.ts` (Supabase count/update); RESEARCH Patterns 4-5 for logic

**DB count pattern** (from RESEARCH — mirror query style in `persist.ts` lines 38-43):

```typescript
const { data: existing, error: selectError } = await supabase
  .from('listings')
  .select('content_hash')
  .eq('source', listing.source)
  .eq('external_id', listing.external_id)
  .maybeSingle();
```

**Insert row shape** (from `persist.ts` lines 53-72 — reuse for UGC listing INSERT):

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
  geom:
    listing.lat != null && listing.lng != null
      ? `SRID=4326;POINT(${listing.lng} ${listing.lat})`
      : null,
};
```

---

### `app/api/ugc/upload/route.ts` (route, file-I/O)

**Analog:** none — greenfield; RESEARCH Pattern 2

**Auth + env pattern** (compose from existing modules):

```typescript
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  ...
}
```

**File pipeline:** `FormData` → `sharp(buffer).autoOrient().jpeg().toBuffer()` → Storage `ugc-photos/{user.id}/{uuid}.jpg`.

---

### `app/api/ugc/listings/route.ts` + `app/api/ugc/listings/[id]/route.ts` (route, CRUD)

**Analog:** `scraper/src/shared/persist.ts`

**POST create:** After Zod parse, call `tagZone()`, reject 422 if null (D-65), INSERT with `source: 'ugc'`, `owner_user_id: user.id`, `expires_at = now + 7d`.

**PATCH status:** UPDATE own row only — RLS enforces `owner_user_id = auth.uid()`; map D-68: `claimed` + `reserved_at`, or `expired`.

**Error handling pattern** (from `persist.ts` lines 45-47, 78-80):

```typescript
if (selectError) {
  throw selectError;
}
...
if (upsertError) {
  throw upsertError;
}
```

Route Handlers should catch and return `Response.json({ error: message }, { status })` instead of throwing to client.

---

### `app/api/messages/conversations/route.ts` + `.../[id]/messages/route.ts` (route, CRUD / request-response)

**Analog:** `scraper/src/shared/persist.ts` (INSERT); `lib/listings/useListingsPoll.ts` (client poll)

**Poll hook pattern** (from `useListingsPoll.ts` lines 9-39):

```typescript
export function useListingsPoll(
  initialListings: ListingRow[],
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
) {
  ...
  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, refresh]);
```

**DM client:** Use 10_000 ms interval while drawer open (D-74); GET accepts optional `since` query param.

**GET handler params pattern** (Next.js 15 — from RESEARCH):

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
```

---

### `app/api/reports/route.ts` (route, CRUD)

**Analog:** `scraper/src/shared/persist.ts` + RESEARCH Pattern 4

**Threshold branch:**

```typescript
const THRESHOLDS = { subito: 2, facebook: 2, ugc: 3 } as const;
// UGC hide: hidden_reason = 'pending_review'
// Scraped hide: hidden_reason = 'community_reports'
```

**Reject logging analog** (from `persist.ts` lines 15-31 — for duplicate report constraint):

```typescript
export async function logReject(
  supabase: SupabaseClient,
  scrapeRunId: string | null,
  externalId: string | null,
  reason: string,
  rawSnippet: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('scrape_rejects').insert({ ... });
  if (error) throw error;
}
```

Return 409 on unique constraint violation per reporter/listing (D-82).

---

### `app/post/page.tsx` (component, request-response)

**Analog:** `app/post/page.tsx` (shell) + `app/settings/page.tsx` (layout)

**Page shell pattern** (from `app/post/page.tsx` lines 1-10):

```typescript
import { messages } from '@/messages/it';

export default function PostPage() {
  return (
    <main className="mx-auto flex h-full max-w-container-max flex-col px-gutter py-space-lg pb-28">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <p className="text-label-sm text-on-surface-variant">{messages.nav.post}</p>
        <h1 className="text-h2 font-bold text-on-surface">{messages.post.title}</h1>
```

**Section card pattern** (from `app/settings/page.tsx` lines 11-30):

```typescript
<section className="rounded border border-outline-variant bg-surface">
  <div className="border-b border-outline-variant p-space-md">
    ...
  </div>
</section>
```

Replace stub body with tabbed client component (`PostForm` / `StreetDumpForm`); keep `pb-28` for BottomNav clearance.

---

### `app/listing/[id]/page.tsx` (route, request-response)

**Analog:** self — extend branch

**Current gate to replace** (lines 12-24):

```typescript
export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const listing = await getListingById(parsed.data);
  if (!listing || listing.source !== 'subito') {
    notFound();
  }

  return <ScrapedListingShell listing={listing} />;
}
```

**Target branch:**

```typescript
if (!listing) notFound();
if (listing.source === 'ugc') return <UgcListingShell listing={listing} />;
if (listing.source === 'subito') return <ScrapedListingShell listing={listing} />;
notFound(); // facebook / unknown
```

**UUID validation pattern** (lines 6-17) — keep unchanged.

---

### `components/ugc/PostForm.tsx` (component, file-I/O)

**Analog:** `src/components/PostItemView.tsx` (UX) + `components/map/ZoneFilterChips.tsx` (zone selection)

**Photo upload UX** (from `PostItemView.tsx` lines 114-171):

```typescript
<div className="group relative cursor-pointer">
  {imagePreview ? (
    <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden border ...">
      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
      ...
    </div>
  ) : (
    <div className="custom-dashed w-full aspect-[16/9] flex flex-col items-center justify-center gap-2 ...">
      <span className="material-symbols-outlined ...">add_a_photo</span>
      ...
    </div>
  )}
  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
</div>
```

**Port to Stitch tokens:** replace hardcoded `#ececec` / `#37352f` with `@theme` classes (`border-outline-variant`, `text-on-surface`, `bg-surface`). Drop category/condition pickers (D-58); add zone chips via `ZoneFilterChips` pattern excluding `'All'`.

**Submit success:** `router.push(`/listing/${id}`)` + `toast(...)` from `@/components/ui/toaster` (see DetailTopBar lines 28-36).

---

### `components/ugc/PinMap.tsx` + `StreetDumpForm.tsx` (component, transform)

**Analog:** `components/map/ListingMap.tsx` + `components/map/LocateMeButton.tsx`

**Map setup** (from `ListingMap.tsx` lines 1-10, 72-79):

```typescript
import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

<Map
  ref={mapRef}
  initialViewState={{ longitude: 12.33, latitude: 45.44, zoom: 11 }}
  mapStyle={OPENFREEMAP_LIBERTY}
  style={{ width: '100%', height: '100%' }}
```

**Geolocation** (from `LocateMeButton.tsx` lines 5-12):

```typescript
<GeolocateControl
  position="bottom-right"
  trackUserLocation={false}
  showUserLocation
/>
```

PinMap: single draggable `Marker`; Street Dump seeds from `navigator.geolocation` but requires explicit confirm before submit (D-57).

---

### `components/ugc/AuthPromptModal.tsx` (component, request-response)

**Analog:** `components/ui/drawer.tsx` + `lib/supabase/client.ts`

**Browser Supabase client** (from `lib/supabase/client.ts` lines 1-7):

```typescript
import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './env';

export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
```

**Modal shell:** Use centered overlay (not vaul drawer) with Stitch border tokens matching `DrawerContent` (lines 39-42):

```typescript
className={cn(
  'fixed inset-x-0 bottom-16 z-50 flex max-h-[95dvh] flex-col rounded-t-lg border border-outline-variant bg-surface outline-none',
  className,
)}
```

Magic link: `signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback?next=${redirectTo}` } })`.

---

### `components/detail/UgcListingShell.tsx` (component, request-response)

**Analog:** `components/detail/ScrapedListingShell.tsx`

**Imports + layout** (lines 1-16, 41-45):

```typescript
'use client';

import { DetailTopBar } from '@/components/detail/DetailTopBar';
import { HeroMetadata } from '@/components/detail/HeroMetadata';
import { Button } from '@/components/ui/button';
import type { ListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';

export function ScrapedListingShell({ listing }: ScrapedListingShellProps) {
  ...
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <DetailTopBar listing={listing} />
      <main className="mx-auto w-full max-w-container-max px-gutter py-space-lg pb-32">
```

**CTA swap:** Replace `claimOnSubito` button (lines 103-110) with **"Contatta"** opening `DmDrawer`; no iframe/WebView block. Reuse sticky aside layout for poster lifecycle actions (`Segna riservato`, `Segna consegnato`).

---

### `components/messages/DmDrawer.tsx` (component, request-response)

**Analog:** `src/components/ChatModal.tsx` + `components/ui/drawer.tsx`

**Vaul drawer usage** (from `MapExplorer.tsx` lines 82-93):

```typescript
<Drawer
  open
  modal={false}
  dismissible={false}
  snapPoints={[0.25, 0.75]}
  activeSnapPoint={activeSnapPoint}
  setActiveSnapPoint={setActiveSnapPoint}
>
  <DrawerContent className="h-full max-h-[95dvh]">
```

**Chat message bubbles** (from `ChatModal.tsx` lines 73-105):

```typescript
<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
  <div className={`max-w-[80%] rounded-md px-3 py-2 text-xs ...`}>
    <p className="leading-relaxed font-medium">{msg.text}</p>
  </div>
</div>
```

Restyle to Stitch tokens (`bg-primary text-on-primary` for sender). Wire poll via `useEffect` + `fetch` to messages API every 10s while `open`.

---

### `components/messages/SafetyModal.tsx` + `SafetyBanner.tsx` (component, event-driven)

**Analog:** `components/ui/button.tsx` (primary CTA) + banner section in `ScrapedListingShell.tsx` (lines 116-129)

**Primary button** (from `button.tsx` lines 10-11):

```typescript
default: 'bg-primary text-on-primary hover:bg-primary-container',
```

SafetyModal blocks first send until "Ho capito" clicked (D-77). SafetyBanner collapsible at thread top (D-78) — use `border-outline-variant bg-surface-container-low` like scraped source card.

---

### `lib/listings/queries.ts` + `types.ts` + `schema.ts` (service/model, CRUD)

**Analog:** self — extend

**Query pattern** (from `queries.ts` lines 5-26):

```typescript
const PUBLIC_LISTINGS = 'listings_public';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at';

export async function getActiveListings(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false });
```

**Extend:** Add `status` to `ACTIVE_LISTING_COLUMNS` and `ListingRow` type after view migration. Add `getOwnerListingById()` querying base `listings` table with auth session for hidden owner view (D-83).

**Type definitions** (from `types.ts` lines 1-16):

```typescript
export type ListingSource = 'subito' | 'facebook' | 'ugc';
export type ListingStatus = 'active' | 'claimed' | 'expired' | 'hidden';

export type ListingRow = {
  id: string;
  source: ListingSource;
  ...
};
```

---

### `components/listings/ListingCard.tsx` + `HeroMetadata.tsx` (component, CRUD)

**Analog:** self — extend badges

**Hardcoded Subito badge to branch** (from `ListingCard.tsx` lines 47-49):

```typescript
<span className="absolute left-space-sm top-space-sm rounded-sm bg-accent-orange ...">
  {messages.listing.sourceSubito}
</span>
```

Branch on `listing.source` for UGC chip; show `Riservato` when `status === 'claimed'` (after view exposes status). Same change in `HeroMetadata.tsx` lines 33-36.

---

### `messages/it.ts` (config)

**Analog:** self — extend nested object

**Structure pattern** (lines 3-98):

```typescript
export const messages = {
  nav: { ... },
  post: {
    title: 'Pubblica un annuncio',
    stubTitle: 'Accedi per pubblicare',
    ...
  },
  detail: { ... },
  listing: { ... },
} as const;
```

Add sections: `post.tabs`, `post.streetDump`, `auth`, `dm`, `safety`, `report`, `ugc.statusReserved`, `ugc.hiddenPendingReview`. Keep Italian-only chrome (D-88).

---

### Test files (`lib/**/*.test.ts`)

**Analog:** `lib/listings/queries.test.ts`, `lib/listings/filters.test.ts`, `scraper/src/shared/zone-tag.test.ts`

**Vitest + alias** (from `vitest.config.ts` lines 4-13):

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

**Mock Supabase pattern** (from `queries.test.ts` lines 17-28):

```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseEnv: vi.fn(() => ({ url: 'https://example.supabase.co', anonKey: 'anon-key' })),
}));
```

**Pure unit test pattern** (from `filters.test.ts` lines 5-16):

```typescript
const baseListing: ListingRow = {
  id: '11111111-1111-1111-1111-111111111111',
  source: 'subito',
  title: 'Lampada gratis',
  ...
};
```

Port zone-tag tests with same coordinates as scraper. Test auto-hide thresholds with pure functions (no DB).

---

## Shared Patterns

### Supabase Client Creation

**Source:** `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/env.ts`  
**Apply to:** All Route Handlers, RSC queries, auth modal

```typescript
// Server (Route Handlers, RSC)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Browser (AuthPromptModal, client poll)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// Graceful empty when env missing
import { getSupabaseEnv } from '@/lib/supabase/env';
if (!getSupabaseEnv()) return [];
```

### Zod Validation on Write Paths

**Source:** `lib/listings/schema.ts`, `app/listing/[id]/page.tsx`  
**Apply to:** All `app/api/*` POST/PATCH handlers

```typescript
import { z } from 'zod';

const listingIdSchema = z.string().uuid();
const parsed = listingIdSchema.safeParse(id);
if (!parsed.success) notFound(); // pages

// API routes:
const body = CreateListingSchema.parse(await request.json()); // throws → catch → 400
```

### Italian UI Strings

**Source:** `messages/it.ts`  
**Apply to:** All new components; never hardcode user-facing Italian in JSX

```typescript
import { messages, zoneLabel, formatRelativeTimeItalian } from '@/messages/it';
```

### Stitch UI Tokens

**Source:** `components/detail/ScrapedListingShell.tsx`, `components/ui/button.tsx`  
**Apply to:** All Phase 3 UI

- Borders: `border-outline-variant`
- Surfaces: `bg-surface`, `bg-surface-container-low`
- Typography: `text-h2`, `text-label-sm`, `text-body-md`
- Icons: `material-symbols-outlined`
- No drop shadows; primary CTA: `bg-primary text-on-primary`

### Toast Confirmation

**Source:** `components/ui/toaster.tsx`, `components/detail/DetailTopBar.tsx`  
**Apply to:** Post success (D-59), share/copy feedback

```typescript
import { toast } from '@/components/ui/toaster';

toast(messages.detail.shareCopied);
```

### Listing Read via Public View

**Source:** `lib/listings/queries.ts`, `lib/listings/client-queries.ts`  
**Apply to:** Map, list, detail (anon read unchanged)

```typescript
const PUBLIC_LISTINGS = 'listings_public';
// Always filter .not('zone', 'is', null) in app layer (D-36)
```

### Session Fingerprint (Reports)

**Source:** `lib/favorites/storage.ts`  
**Apply to:** Anonymous report dedup (D-82 discretion)

```typescript
localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
// Pattern: dedicated key + JSON parse with try/catch guard
```

---

## No Analog Found

Files with no close match — planner should use RESEARCH.md patterns:

| File | Role | Data Flow | Reason |
|------|------|-----------|------|
| `app/auth/callback/route.ts` | route | request-response | No Route Handlers exist in app yet |
| `app/api/ugc/upload/route.ts` | route | file-I/O | First multipart upload handler; use RESEARCH Pattern 2 + sharp |
| `lib/supabase/auth.ts` | utility | request-response | No auth helpers exist; compose from `@supabase/ssr` docs |
| `lib/ugc/exif-strip.ts` | utility | file-I/O | No image pipeline in app; wrap sharp per RESEARCH |
| `lib/ugc/rate-limit.ts` | utility | CRUD | No rate limiting in codebase; RESEARCH Pattern 5 |

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `messages/`, `src/components/` (Vite prototypes), `scraper/src/shared/`, `supabase/migrations/`  
**Files scanned:** 103 TypeScript/TSX source files (excluding `.next/`, `node_modules/`)  
**Pattern extraction date:** 2026-07-30

**Key integration landmines (from codebase audit):**
1. `lib/supabase/server.ts` no-op `setAll` — fix in T0 before auth
2. `app/listing/[id]/page.tsx` rejects non-Subito — branch in T2
3. `listings_public` view excludes `claimed` — extend in migration 007
4. No `app/api/` routes — all UGC writes are greenfield Route Handlers
5. Zone logic only in scraper — port to `lib/geo/` before post API
