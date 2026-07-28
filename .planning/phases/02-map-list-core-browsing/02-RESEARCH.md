# Phase 2: Map + List Core Browsing - Research

**Researched:** 2026-07-28
**Domain:** Next.js App Router PWA + MapLibre map-first browsing + Supabase anon reads + pre-auth favorites
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 replaces the Vite tab-state prototype with a **Next.js App Router** frontend that reads Phase 1's `listings` table via **Supabase anon + RLS**, renders a **MapLibre + react-map-gl** Venice map with **OpenFreeMap** tiles, and wraps listings in a **vaul/shadcn bottom sheet** synced to list cards. Scraped Subito detail uses a **canonical-metadata shell** with external deep-link CTAs — **not a reliable iframe embed**, because Subito serves `X-Frame-Options: SAMEORIGIN` [CITED: urlscan.io Subito scan]. Expiry is enforced at **query time** (`status = 'active' AND expires_at > now()`) plus a **pg_cron housekeeping job** that flips stale rows to `expired`. Favorites live in **localStorage** until Phase 4.

The existing `src/components/*` Stitch UI is **portable** (layout, chips, cards, shell chrome) but routing, data types, map pins, and persistence must be **rewritten** — do not wrap the whole Vite `App.tsx` as the final architecture (D-24 locks a new `app/` tree with URL routes).

**Primary recommendation:** Scaffold Next.js in-repo, port UI components into `components/`, add `lib/supabase` + `lib/listings/queries.ts`, ship map home at `/` with vaul snap points `[0.25, 0.75]` and `modal={false}`, and implement Subito detail as a **preview shell + `window.open(external_url)`** with iframe only as an optional degraded attempt.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### App Shell & Frontend Stack
- **D-24:** Migrate from the Vite tab-state SPA prototype to **Next.js App Router** (new `app/` tree) for Phase 2 — enables shareable listing URLs, Server Components for initial fetch, and the planned PWA path on Vercel — **Reversibility:** costly — undo means maintaining two frontends or a full revert of routing/data layers.
- **D-25:** **Port and preserve** the Google Stitch Structured Minimalist look from existing `src/components/*` and `.planning/google-stitch-ui-design/DESIGN.md` — do not redesign; extend the Notion-adjacent palette and layout density — **Reversibility:** reversible.
- **D-26:** Replace tab-state routing (`NavTab` in `src/App.tsx`) with **URL-based routes**: `/` = map home, `/listing/[id]` = detail/WebView shell — **Reversibility:** costly — deep links and share URLs depend on this shape.

#### Map-First Home Layout
- **D-27:** **Map is the default home route** — opening the app lands on the map with pins, not the list grid — **Reversibility:** reversible.
- **D-28:** Use a **draggable bottom sheet** over the map with two snap points: collapsed (~25% viewport, peek at 2–3 listing cards) and expanded (~75% viewport); map stays visible and pannable in both — **Reversibility:** reversible.
- **D-29:** **Bidirectional map↔list sync**: tapping a pin highlights + scrolls the matching card; tapping a list card centers/focuses the pin and opens a compact popup — **Reversibility:** reversible.
- **D-30:** Retain **BottomNav** with Map / List / Post / Settings tabs; List tab shows the full-screen feed (`ListView` pattern) while Map tab is the primary map+sheet experience — **Reversibility:** reversible.

#### Map Provider & Viewport
- **D-31:** **MapLibre GL JS + react-map-gl** for rendering; vector tiles from **OpenFreeMap** (free, no token) with MapTiler free tier as fallback if styling needs exceed OpenFreeMap — **Reversibility:** costly — map integration touches pins, sheet, and detail flows.
- **D-32:** Default viewport centered on **Venice** (~45.44°N, 12.33°E, zoom ~11) showing all three zones; include optional **"Locate me"** button (browser geolocation) that re-centers but does **not** filter listings by default — **Reversibility:** reversible.
- **D-33:** Plot pins from **`lat`/`lng`** on each listing row; listings with null coordinates are **excluded from map pins** but may appear in list with a "approximate zone" badge if `zone` is set — **Reversibility:** reversible.

#### Zone Filter UX
- **D-34:** Zone filter as **horizontal chip row**: All / Centro Storico / Mestre-Marghera / Lido-Murano — maps 1:1 to Phase 1 `venice_zone` enum; remove prototype mock zones (e.g. Jing'an) — **Reversibility:** reversible.
- **D-35:** Zone filter applies **simultaneously** to map pins and bottom-sheet/list views; default **All** shows every active, non-expired listing with a non-null zone — **Reversibility:** reversible.
- **D-36:** Listings with **`zone = null`** (operator-review rows from Phase 1 D-15) are **hidden from all user-facing feeds** in Phase 2 — **Reversibility:** reversible.

#### Data Fetching & Supabase Integration
- **D-37:** Read listings via **Supabase anon client** with RLS allowing public `SELECT` on rows where `status = 'active' AND expires_at > now()` — **Reversibility:** one-way — RLS policies are migration-sensitive.
- **D-38:** Initial load via **Next.js Server Component** fetch; client **poll refresh every 5 minutes** plus pull-to-refresh on list — no realtime subscription (scraper cadence is 1–2 hr) — **Reversibility:** reversible.
- **D-39:** Map bounding-box queries deferred — Phase 2 loads **all active Venice listings** (expected low volume at launch); optimize with bbox/zone-indexed queries only if perf regresses — **Reversibility:** reversible.

#### 48-Hour Expiry Enforcement (SCRP-04)
- **D-40:** Enforce expiry at **query time** in every user-facing read: `expires_at > now() AND status = 'active'` — **Reversibility:** reversible.
- **D-41:** Add **pg_cron daily job** to set `status = 'expired'` where `expires_at < now()` for housekeeping and operator visibility — **Reversibility:** reversible.

#### Scraped Listing Detail & WebView Shell
- **D-42:** Scraped listings (`source = 'subito'`) open in an **in-app WebView shell** route — embedded iframe (or equivalent) loading `external_url` — not a native detail page duplicating Subito content — **Reversibility:** costly.
- **D-43:** WebView **top bar controls**: Back to list/map, Favorite (heart), Share (Web Share API with clipboard fallback), **"Apri su Subito"** opens `external_url` in a new browser tab — **Reversibility:** reversible.
- **D-44:** Primary CTA on scraped detail is **"Claim on Subito"** (external deep-link) — **no in-app contact/DM** for scraped listings — **Reversibility:** one-way — core product boundary from Phase 1.
- **D-45:** Show listing **title, source badge (`subito`), zone chip, posted time, and hero photo** above or beside the WebView frame from our canonical schema — not scraped from the iframe — **Reversibility:** reversible.

#### Favorites (Pre-Auth)
- **D-46:** Phase 2 favorites persist in **localStorage** (`shoumanwu_favorites`, array of listing UUIDs) — no login required yet; Phase 4 migrates to Supabase-backed user favorites with AUTH-02 login gate — **Reversibility:** costly — Phase 4 needs a migration/import path.
- **D-47:** Favorite toggle available from **list card, map popup, and WebView top bar** without leaving the current view — **Reversibility:** reversible.
- **D-48:** Favorites tab/route (`/favorites`) shows saved listings fetched by ID from Supabase; empty state prompts browsing the map — **Reversibility:** reversible.

#### Login-Optional Browsing
- **D-49:** **No login wall** anywhere in Phase 2 — full map/list/detail/browse without account; auth gates deferred entirely to Phase 4 — **Reversibility:** reversible.
- **D-50:** Post tab and Settings profile show **non-blocking stubs** ("Accedi per pubblicare" / profile placeholder) — functional UGC and auth come in Phases 3–4 — **Reversibility:** reversible.

#### UI Language (Pre-i18n)
- **D-51:** Ship Phase 2 UI copy in **Italian** (primary audience) with strings centralized in a `messages/it.ts` constants module — English/Chinese toggles deferred to Phase 5 — **Reversibility:** reversible.
- **D-52:** Listing **titles remain as scraped** (Italian from Subito); only app chrome is translated — **Reversibility:** reversible.

#### Component Library
- **D-53:** Use **shadcn/ui** (Radix-based) for bottom sheet, dialog, and toast primitives; style with Stitch tokens from `DESIGN.md`, not default shadcn palette — **Reversibility:** reversible.

### Claude's Discretion
- Exact OpenFreeMap vs MapTiler tile style URL
- Whether iframe sandbox attributes allow scripts (prefer restrictive sandbox; fall back to top-level redirect if Subito blocks embed)
- Pull-to-refresh implementation (native overscroll vs button)
- Map pin clustering threshold (enable clustering only if > ~50 visible pins)
- Favorites empty-state illustration/copy
- Server vs client component split per route

### Deferred Ideas (OUT OF SCOPE)
- UGC quick-post and Street Dump — Phase 3
- In-app DM, reserve/mark-as-sent — Phase 3
- Login gates (Google/Apple/email) — Phase 4
- Supabase-backed favorites sync — Phase 4 (migrate from localStorage)
- Push alerts and keyword matching — Phase 4
- Full trilingual UI (EN/ZH toggle) — Phase 5
- FB Marketplace scraped listings in UI — v2 (SCRP-07)
- Report/claim-expired moderation button — Phase 3 (MOD-01)
- Real-time listing updates / websockets — unnecessary given 1–2 hr scraper cadence
- Native mobile app — v2 (PLAT-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | Map-first home with pins for active free listings | MapLibre + react-map-gl on `/`; pins from `lat`/`lng`; OpenFreeMap style; Venice default viewport |
| DISC-02 | Draggable bottom-sheet list alongside map | shadcn Drawer (vaul) with `snapPoints={[0.25, 0.75]}`, `modal={false}`; port `MapView` sheet layout |
| DISC-03 | Zone filter on map + list | Chip row maps to `venice_zone` enum; shared client filter state; exclude `zone IS NULL` in app query |
| DISC-04 | Scraped listing in-app shell with favorite/share/back | `/listing/[id]` route; canonical header from DB; top bar actions; Subito embed fallback pattern |
| DISC-05 | Deep-link out to Subito without in-app contact | Primary CTA opens `external_url` in new tab; no DM UI for `source = 'subito'` |
| DISC-06 | Favorite without leaving flow | `localStorage` hook + heart on card/popup/shell; Supabase fetch by ID on `/favorites` |
| DISC-07 | Browse without account | Anon Supabase RLS SELECT only; no auth middleware; Post/Settings stubs only |
| SCRP-04 | Auto-expire listings after 48h | Query-time filter + pg_cron daily status flip; aligns with Phase 1 `expires_at` field |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Listing reads & expiry filter | Database / Storage (Postgres + RLS) | API / Backend (Supabase PostgREST via JS client) | RLS enforces anon read boundary at data layer; app adds `zone IS NOT NULL` filter |
| Initial listing payload | Frontend Server (SSR RSC) | Database | Server Component fetch reduces TTFB and empty-map flash |
| Map render, pins, geolocation | Browser / Client | — | MapLibre requires WebGL + client interactivity |
| Bottom sheet + map↔list sync | Browser / Client | — | Drag gestures, scroll-into-view, selected pin state are client-only |
| Zone chip filter | Browser / Client | — | UI state; filters in-memory listing array (low volume at launch) |
| 5-min poll + pull-to-refresh | Browser / Client | Database | Client re-fetch; no websockets per D-38 |
| Favorites persistence | Browser / Client (localStorage) | Database (read by ID) | Pre-auth storage is client; hydration fetches current rows from Supabase |
| Scraped detail shell | Browser / Client | CDN / Static (hero `photo_url`) | Route renders DB metadata; external page opens in new tab |
| Expiry housekeeping cron | Database (pg_cron) | — | Status flip is server-side batch SQL |
| Scraper writes | API / Backend (worker) | Database | Phase 2 is read-only; unchanged Phase 1 worker path |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.12 | App Router, RSC, Vercel deploy | Locked D-24; shareable URLs, server fetch [VERIFIED: npm registry] |
| react / react-dom | 19.2.8 | UI | Required by Next 16 [VERIFIED: npm registry] |
| maplibre-gl | 6.0.0 | WebGL map engine | Locked D-31; MIT, no token billing [VERIFIED: npm registry] |
| react-map-gl | 8.1.1 | React MapLibre bindings | Official visgl adapter; import from `react-map-gl/maplibre` [VERIFIED: npm registry] |
| @supabase/supabase-js | 2.110.9 | Anon listing reads | Phase 1 store; typed client [VERIFIED: npm registry] |
| @supabase/ssr | 0.12.3 | Cookie-ready server client | Next App Router pattern for RSC + future auth [VERIFIED: npm registry] |
| vaul | 1.1.2 | Bottom sheet physics | shadcn Drawer foundation; snap points [VERIFIED: npm registry] |
| zod | 4.4.3 | Runtime listing validation | Align with `scraper/src/shared/schema.ts` [VERIFIED: npm registry] |
| tailwindcss | 4.x (keep existing) | Stitch styling | Already in Vite prototype `@theme` tokens |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.27.0 | Icons | shadcn companion; replace Material Symbols gradually if desired |
| shadcn CLI | 4.15.0 | Drawer, toast, dialog | Locked D-53; `npx shadcn@latest add drawer toast` |
| supercluster | 8.0.1 | Pin clustering | Only if visible pin count exceeds ~50 (Claude's discretion) |
| vitest + @testing-library/react | 3.x / 16.x | Unit/component tests | Wave 0 for `lib/` hooks and query builders |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenFreeMap | MapTiler free tier | MapTiler needs API key; better style tooling; use if OpenFreeMap styling insufficient (D-31 fallback) |
| vaul/shadcn Drawer | Custom CSS bottom sheet | Faster hack but loses snap physics, a11y, and drag handle — not worth hand-rolling (D-53) |
| iframe Subito embed | External-link-only shell | iframe blocked by Subito `X-Frame-Options: SAMEORIGIN` — see WebView section |
| @serwist/next PWA | Defer to Phase 4 | PWA install/push not in Phase 2 scope; avoid scope creep |

**Installation:**

```bash
# From repo root — add Next alongside existing Vite until cutover
npm install next@16.2.12 react@19.2.8 react-dom@19.2.8
npm install maplibre-gl@6.0.0 react-map-gl@8.1.1
npm install @supabase/supabase-js@2.110.9 @supabase/ssr@0.12.3 zod@4.4.3
npm install vaul lucide-react
npx shadcn@latest init
npx shadcn@latest add drawer toast button
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

**Version verification:** `npm view <package> version` run 2026-07-28 for all packages above.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| next | npm | patch 2026-07-25 | ~52M/wk | github.com/vercel/next.js | SUS (too-new patch) | Approved — official framework |
| react | npm | patch 2026-07-21 | ~163M/wk | github.com/facebook/react | SUS (too-new patch) | Approved — official runtime |
| react-dom | npm | patch 2026-07-21 | ~154M/wk | github.com/facebook/react | SUS (too-new patch) | Approved |
| maplibre-gl | npm | patch 2026-07-22 | ~3.8M/wk | github.com/maplibre/maplibre-gl-js | SUS (too-new patch) | Approved — official MapLibre |
| react-map-gl | npm | 2026-04-11 | ~2M/wk | github.com/visgl/react-map-gl | OK | Approved |
| @supabase/supabase-js | npm | patch 2026-07-27 | ~22M/wk | github.com/supabase/supabase-js | SUS (too-new patch) | Approved — official Supabase |
| @supabase/ssr | npm | — | — | github.com/supabase/ssabase-js | [ASSUMED] OK | Approved — official Supabase docs |
| vaul | npm | 2024-12-14 | ~37M/wk | github.com/emilkowalski/vaul | OK | Approved |
| zod | npm | 2026-05-04 | ~240M/wk | github.com/colinhacks/zod | OK | Approved |
| lucide-react | npm | patch 2026-07-25 | ~97M/wk | github.com/lucide-icons/lucide | SUS (too-new patch) | Approved |
| supercluster | npm | — | — | mapbox/supercluster | [ASSUMED] | Optional clustering only |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** next, react, react-dom, maplibre-gl, @supabase/supabase-js, lucide-react — all flagged only for recent patch publish date, not slopsquatting signals. No `checkpoint:human-verify` needed beyond normal version pin review.

**Postinstall scripts:** none risky on vaul, maplibre-gl, @supabase/supabase-js (verified `npm view … scripts.postinstall` empty).

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js client)                         │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────────────┐  │
│  │ BottomNav    │   │ MapExplorer      │   │ ListingFeed / Favorites  │  │
│  │ Header       │   │ MapLibre+sheet   │   │ cards, zone chips        │  │
│  └──────┬───────┘   └────────┬─────────┘   └────────────┬─────────────┘  │
│         │                    │                           │                │
│         │           ┌────────▼─────────┐                 │                │
│         │           │ localStorage      │◄── favorites ───┤                │
│         │           │ shoumanwu_favorites│                │                │
│         └──────────►│ Client poll 5min  │◄── refresh ─────┘                │
└─────────────────────┼──────────────────┼──────────────────────────────────┘
                      │                  │
         RSC initial  │                  │ anon SELECT
                      ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Next.js Server (App Router RSC on `/`, `/listing/[id]`)     │
│              lib/supabase/server.ts → lib/listings/queries.ts            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Supabase Postgres (listings table)                    │
│  RLS: SELECT where status='active' AND expires_at > now()               │
│  pg_cron daily: SET status='expired' WHERE expires_at < now()           │
└───────────────────────────────▲─────────────────────────────────────────┘
                                │ service role writes
┌───────────────────────────────┴─────────────────────────────────────────┐
│                   scraper/ worker (Phase 1, unchanged)                   │
└─────────────────────────────────────────────────────────────────────────┘

Scraped detail path:
  /listing/[id] → read row → render canonical header/photo
              → "Apri su Subito" / "Claim on Subito" → window.open(external_url)
              → (optional) iframe attempt → blocked → show fallback CTA panel
```

### Recommended Project Structure

Phase 2 ships **without `[locale]` segment** (i18n deferred Phase 5). Keep `scraper/` separate. Vite prototype stays until Next cutover, then remove `vite.config.ts` + `src/main.tsx`.

```
app/
├── layout.tsx                 # Root shell: Header + BottomNav + children
├── globals.css                # Port src/index.css @theme tokens
├── page.tsx                   # Map home (Server wrapper → MapExplorer client)
├── list/page.tsx              # Full-screen ListView port
├── favorites/page.tsx         # Favorites feed
├── listing/[id]/page.tsx      # Scraped detail shell (RSC fetch + client actions)
├── post/page.tsx              # Stub ("Accedi per pubblicare")
└── settings/page.tsx          # Stub profile placeholder

components/
├── shell/
│   ├── Header.tsx             # Port from src/components/Header.tsx
│   └── BottomNav.tsx          # Port; use next/link for tabs
├── map/
│   ├── MapExplorer.tsx        # Map + sheet orchestrator ('use client')
│   ├── ListingMap.tsx         # react-map-gl Map, pins, popups
│   ├── ZoneFilterChips.tsx    # All | centro_storico | mestre_marghera | lido_murano
│   └── LocateMeButton.tsx     # GeolocateControl wrapper
├── listings/
│   ├── ListingCard.tsx        # Port ListView card; source badge, zone chip
│   ├── ListingFeed.tsx        # Scrollable list in sheet + /list page
│   └── ListingPopup.tsx       # Compact map popup card
├── detail/
│   └── ScrapedListingShell.tsx # Hero + metadata + external CTA (+ iframe fallback)
└── ui/                        # shadcn: drawer.tsx, toast.tsx, button.tsx

lib/
├── supabase/
│   ├── client.ts              # createBrowserClient (anon key)
│   ├── server.ts              # createServerClient for RSC
│   └── env.ts                 # NEXT_PUBLIC_SUPABASE_URL, ANON_KEY validation
├── listings/
│   ├── types.ts               # DB row type aligned with 002_listings_schema.sql
│   ├── queries.ts             # getActiveListings, getListingById, getListingsByIds
│   ├── filters.ts             # zone filter, non-null lat/lng for map
│   └── schema.ts              # Zod read schema (subset of scraper canonical)
└── favorites/
    ├── storage.ts             # localStorage CRUD, key shoumanwu_favorites
    └── useFavorites.ts        # Client hook: toggle, hydrate, isFavorite

messages/
└── it.ts                      # Italian UI strings (D-51)

supabase/migrations/
├── 004_listings_public_read_rls.sql
└── 005_expire_listings_cron.sql

# Port sources (delete after migration):
src/components/*.tsx           # Reference only during port
```

### Pattern 1: Next.js App Router Migration (Vite → Next)

**What:** Add Next.js **in the same repo**; port presentational components; **rewrite** routing, data, and types — do not ship the dynamic-import-Vite-whole-App bridge as the final product.

**Port (preserve JSX/Tailwind layout):**
- `src/components/Header.tsx` → `components/shell/Header.tsx`
- `src/components/BottomNav.tsx` → `components/shell/BottomNav.tsx` (replace `onTabChange` with `<Link href>`)
- `src/components/ListView.tsx` → `components/listings/ListingFeed.tsx` (swap `Item` → `ListingRow`)
- `src/components/MapView.tsx` → sheet/chips/search **layout only**; replace decorative map with `ListingMap.tsx`
- `src/components/ItemDetailView.tsx` → `components/detail/ScrapedListingShell.tsx` (strip claim/DM/similar-items UGC flows)
- `src/index.css` → `app/globals.css`

**Rewrite (do not port logic):**
- `src/App.tsx` tab state → file-based routes + small client stores
- `src/types.ts` `Item` → `lib/listings/types.ts` matching DB enums
- `src/data/initialItems.ts` → Supabase queries
- Mock claim/chat/setTimeout handlers → delete

**Server vs client split (recommended):**

| Route | Server | Client |
|-------|--------|--------|
| `/` | RSC: `getActiveListings()` pass as props | `MapExplorer` (map, sheet, sync, poll) |
| `/list` | RSC: initial listings | Optional pull-to-refresh wrapper |
| `/listing/[id]` | RSC: `getListingById(id)` | Favorite/share buttons, iframe attempt |
| `/favorites` | — | Client: read localStorage IDs → Supabase `.in('id', ids)` |

**Example — Server Component page with client map:**

```tsx
// app/page.tsx
// Source: [CITED: next.js App Router data fetching v16.2.2]
import { getActiveListings } from '@/lib/listings/queries'
import { MapExplorer } from '@/components/map/MapExplorer'

export default async function MapHomePage() {
  const listings = await getActiveListings()
  return <MapExplorer initialListings={listings} />
}
```

```tsx
// components/map/ListingMap.tsx
'use client'
// Source: [CITED: openfreemap.org/quick_start] [CITED: react-map-gl maplibre docs]
import Map, { Marker, Popup, GeolocateControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty'

export function ListingMap({ listings, selectedId, onSelect }) {
  return (
    <Map
      initialViewState={{ longitude: 12.33, latitude: 45.44, zoom: 11 }}
      mapStyle={OPENFREEMAP_LIBERTY}
      style={{ width: '100%', height: '100%' }}
    >
      <GeolocateControl position="top-right" trackUserLocation={false} />
      {listings.filter(l => l.lat != null && l.lng != null).map(l => (
        <Marker key={l.id} longitude={l.lng!} latitude={l.lat!} onClick={() => onSelect(l.id)} />
      ))}
    </Map>
  )
}
```

### Pattern 2: Supabase Anon RLS + Query-Time Expiry

**What:** New migration enables RLS on `listings` with anon SELECT gated on active + non-expired rows. App queries **repeat the same predicates** (defense in depth). `zone IS NULL` filtered in app code (D-36), not RLS — operator rows remain in DB.

```sql
-- supabase/migrations/004_listings_public_read_rls.sql
-- Source: [CITED: supabase.com/docs/guides/database/postgres/row-level-security]

alter table public.listings enable row level security;

grant select on public.listings to anon;
grant select on public.listings to authenticated;

create policy "public_read_active_non_expired"
on public.listings
for select
to anon, authenticated
using (
  status = 'active'
  and expires_at > now()
);
```

```typescript
// lib/listings/queries.ts
// Source: [CITED: supabase/supabase-js PostgrestQueryBuilder]
import { createClient } from '@/lib/supabase/server'

export async function getActiveListings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listings')
    .select('id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
```

**Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (never service role in Next.js client bundle).

### Pattern 3: Bottom Sheet (shadcn Drawer / vaul)

**What:** Map-first home uses a **always-open** bottom drawer at snap point 0.25, expandable to 0.75. Map must stay pannable — use `modal={false}`, `dismissible={false}`, `snapPoints={[0.25, 0.75]}`.

```tsx
// components/map/MapExplorer.tsx (excerpt)
// Source: [CITED: ui.shadcn.com/docs/components/drawer] [CITED: vaul snap points]
'use client'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

export function MapExplorer({ initialListings }) {
  const [snap, setSnap] = useState<number | string | null>(0.25)
  return (
    <div className="relative h-[calc(100dvh-8rem)]">
      <ListingMap /* ... */ />
      <Drawer
        open
        modal={false}
        dismissible={false}
        snapPoints={[0.25, 0.75]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <DrawerContent className="h-full max-h-[95dvh]">
          <ListingFeed listings={filtered} onSelect={handleSelect} />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
```

**Styling pitfall:** shadcn v4 DrawerContent may ship `max-h-[80vh]` — conflicts with 25% collapsed snap; override with `max-h-[95dvh]` or remove max-h [CITED: github.com/shadcn-ui/ui#6891].

**vaul pitfall:** Controlled drawer + `modal={false}` can leave `pointer-events: none` on `body` — test early; workarounds include hidden `DrawerTrigger` ref click or `body { pointer-events: auto !important }` when broken [CITED: github.com/emilkowalski/vaul#509]. Budget time in plan for map click-through QA on iOS Safari.

### Pattern 4: Scraped Listing Shell (WebView Fallback)

**What:** `/listing/[id]` renders **canonical DB fields** (D-45) plus external navigation (D-43, D-44). Treat iframe as **best-effort** — Subito responds with `X-Frame-Options: SAMEORIGIN` [CITED: urlscan.io Subito scan], so cross-origin embed will be refused by browsers [CITED: developer.mozilla.org/X-Frame-Options].

**Recommended shell layout:**
1. Sticky top bar: Back, Favorite, Share, "Apri su Subito"
2. Hero `photo_url`, title, source badge, zone chip, relative posted time
3. Primary CTA: **"Claim on Subito"** → `window.open(listing.external_url, '_blank', 'noopener,noreferrer')`
4. Optional iframe region with `onError` / load timeout → show explanatory fallback panel (Italian copy) directing user to CTA

```tsx
// components/detail/ScrapedListingShell.tsx (excerpt)
'use client'
const IFRAME_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox' // NO allow-scripts unless proven necessary

export function ScrapedListingShell({ listing }: { listing: ListingRow }) {
  const [embedBlocked, setEmbedBlocked] = useState(false)
  return (
    <>
      <DetailTopBar listing={listing} />
      <HeroMetadata listing={listing} />
      <button onClick={() => window.open(listing.external_url, '_blank', 'noopener')}>
        Claim on Subito
      </button>
      {!embedBlocked && (
        <iframe
          src={listing.external_url}
          sandbox={IFRAME_SANDBOX}
          className="w-full h-[50vh] border rounded-md"
          onError={() => setEmbedBlocked(true)}
        />
      )}
      {embedBlocked && (
        <p>L&apos;annuncio Subito non può essere incorporato. Apri su Subito per reclamarlo.</p>
      )}
    </>
  )
}
```

**Product interpretation of D-42:** "WebView shell" = in-app **surround** with our chrome + external content attempt — satisfied even when embed fails, as long as back/favorite/share/deep-link-out work (DISC-04, DISC-05).

### Pattern 5: pg_cron Expiry Housekeeping

**What:** Daily job sets `status = 'expired'` for rows past `expires_at`. UI already hides them via query-time filter (D-40); cron supports operator visibility and future admin queries (D-41).

```sql
-- supabase/migrations/005_expire_listings_cron.sql
-- Source: [CITED: supabase.com/docs/guides/cron/install] [CITED: github.com/citusdata/pg_cron]

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'expire-stale-listings',
  '0 3 * * *',
  $$
    update public.listings
    set status = 'expired'
    where status = 'active'
      and expires_at < now();
  $$
);
```

Monitor via `select * from cron.job_run_details order by end_time desc limit 20;` [CITED: supabase/supabase cron docs].

### Pattern 6: localStorage Favorites (Pre-Auth)

**What:** Single key `shoumanwu_favorites` stores JSON string array of listing UUIDs. Phase 4 migration reads same key client-side after login.

```typescript
// lib/favorites/storage.ts
const KEY = 'shoumanwu_favorites'

export function readFavoriteIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function toggleFavoriteId(id: string): string[] {
  const set = new Set(readFavoriteIds())
  set.has(id) ? set.delete(id) : set.add(id)
  const next = [...set]
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
```

```typescript
// Favorites page hydration
const ids = readFavoriteIds()
const { data } = await supabase.from('listings').select('*').in('id', ids)
// RLS drops expired/inactive favorites silently — prune stale IDs client-side
```

### Anti-Patterns to Avoid

- **Wrapping entire Vite `App.tsx` via `dynamic(..., { ssr: false })` as final architecture** — contradicts D-24/D-26; OK only as a one-day spike, not Phase 2 deliverable.
- **Relying on iframe for Subito** — will fail in production; ship external-link shell first.
- **Service role key in Next.js client** — bypasses RLS; anon key only in browser.
- **Re-tagging zones in UI** — zone comes from ingestion (Phase 1 D-14); UI filters only.
- **Mock geo pins** — use real `lat`/`lng` or exclude from map (D-33).
- **Keeping Jing'an / Shanghai mock zones** — replace with Venice enum chips (D-34).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map rendering + markers | Custom canvas/SVG map | MapLibre + react-map-gl | WebGL, gestures, geolocation, popups |
| Bottom sheet drag physics | CSS-only fixed panel | vaul via shadcn Drawer | Snap points, handle, momentum |
| Postgres row-level public read | Custom API proxy on Vercel | Supabase RLS + anon client | Policy lives with data; less attack surface |
| Expiry cron infrastructure | Node cron on Vercel | pg_cron in Supabase | Already on Pro plan; SQL-native scheduling |
| Listing type validation | Ad-hoc TS interfaces | Zod schema shared with scraper shape | Drift detection vs Phase 1 writes |
| Toast notifications | `alert()` | shadcn toast (Radix) | Accessible, styled, non-blocking |

**Key insight:** The map and bottom sheet are deceptively complex interaction surfaces; the data layer is deceptively sensitive (RLS mistakes = leaking non-public rows).

## Common Pitfalls

### Pitfall 1: Subito iframe blocked (X-Frame-Options)

**What goes wrong:** Blank iframe, console error "Refused to display in a frame because it set X-Frame-Options to SAMEORIGIN".
**Why it happens:** Subito security headers forbid cross-origin embedding [CITED: urlscan.io].
**How to avoid:** Build detail shell around canonical fields + external CTA; treat iframe as optional.
**Warning signs:** Local dev appears fine with some URLs but production Subito listing pages all fail.

### Pitfall 2: vaul `modal={false}` breaks map clicks

**What goes wrong:** Map pins not clickable when sheet open; `body { pointer-events: none }`.
**Why it happens:** Known vaul controlled-mode bug [CITED: github.com/emilkowalski/vaul#509].
**How to avoid:** Test map+sheet integration on iOS Safari early; apply documented workarounds.
**Warning signs:** Clicks work only when sheet fully collapsed.

### Pitfall 3: RLS enabled without GRANT SELECT

**What goes wrong:** All anon queries return permission denied.
**Why it happens:** Supabase requires both GRANT and policy [CITED: supabase RLS docs].
**How to avoid:** Migration includes `grant select on public.listings to anon`.
**Warning signs:** Empty map despite rows in Supabase dashboard table editor (service role).

### Pitfall 4: Query/client filter drift on expiry

**What goes wrong:** Expired listings flash on map until cron runs.
**Why it happens:** Cron is housekeeping only (D-41); UI must filter `expires_at > now()` always (D-40).
**How to avoid:** Centralize predicates in `lib/listings/queries.ts`; never inline divergent filters.
**Warning signs:** Listings older than 48h visible briefly after midnight UTC.

### Pitfall 5: Stale favorites after expiry

**What goes wrong:** Heart shows favorite but card missing — UUID in localStorage points to RLS-hidden row.
**Why it happens:** RLS excludes expired rows from `.in('id', ids)` results.
**How to avoid:** After fetch, prune IDs not returned; optional empty-state copy on `/favorites`.
**Warning signs:** Favorite count badge ≠ rendered cards.

### Pitfall 6: Next + Vite port conflict

**What goes wrong:** Two dev servers, duplicate React, broken HMR.
**Why it happens:** Both toolchains coexist during migration.
**How to avoid:** Switch `package.json` scripts to `next dev`; keep Vite config until deletion PR.
**Warning signs:** `Invalid hook call` or double React in bundle analyzer.

### Pitfall 7: shadcn Drawer max-height vs 25% snap

**What goes wrong:** Collapsed sheet invisible or 0 height.
**Why it happens:** Default `max-h-[80vh]` vs low snap fraction [CITED: shadcn-ui/ui#6891].
**How to avoid:** Override DrawerContent height classes during shadcn install.
**Warning signs:** Sheet handle visible but no card peek at collapsed state.

## Code Examples

### OpenFreeMap + react-map-gl (MapLibre adapter)

```tsx
'use client'
import Map from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

// Source: [CITED: openfreemap.org/quick_start]
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
// Alternatives: positron, bright, dark — [CITED: openfreemap.org/quick_start]

export default function VeniceMap() {
  return (
    <Map
      mapStyle={STYLE_URL}
      initialViewState={{ longitude: 12.33, latitude: 45.44, zoom: 11 }}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
```

### Supabase server client (RSC)

```typescript
// lib/supabase/server.ts
// Source: [CITED: supabase/ssr Next.js pattern]
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // Phase 2: no auth cookie writes
      },
    }
  )
}
```

### Client poll refresh (5 minutes)

```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useListingsPoll(initial, intervalMs = 5 * 60 * 1000) {
  const [listings, setListings] = useState(initial)
  useEffect(() => {
    const supabase = createClient()
    const id = setInterval(async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .not('zone', 'is', null)
      if (data) setListings(data)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return listings
}
```

### Map pin clustering (when > ~50 pins)

```tsx
// Use MapLibre GeoJSON source with cluster: true — not per-Marker React trees
// Source: [CITED: maplibre/maplibre-gl-js cluster example]
map.addSource('listings', {
  type: 'geojson',
  data: geojsonFeatureCollection,
  cluster: true,
  clusterRadius: 50,
})
```

### Web Share with clipboard fallback

```tsx
async function shareListing(listing: { title: string; id: string }) {
  const url = `${window.location.origin}/listing/${listing.id}`
  if (navigator.share) {
    await navigator.share({ title: listing.title, url })
    return
  }
  await navigator.clipboard.writeText(url)
  // toast: "Link copiato"
}
```

## Integration Points with Phase 1 Schema

| Phase 1 artifact | Phase 2 consumption |
|------------------|---------------------|
| `supabase/migrations/002_listings_schema.sql` | Direct `listings` SELECT; enums `listing_source`, `listing_status`, `venice_zone` |
| `scraper/src/shared/schema.ts` | Mirror Zod bounds for read validation; map `VeniceZone` to chip labels |
| `scraper/src/geo/*.geojson` | Optional zone polygon overlay on map (nice-to-have, not required for DISC-03) |
| `expires_at = posted_at + 48h` (D-12) | Query filter + cron job |
| `zone = null` operator rows (D-15) | App filter `.not('zone','is',null)` (D-36) |
| `source = 'subito'` only in Phase 1 | UI source badge; detail shell external-link pattern |
| Scraper service-role writes (D-07) | No Phase 2 write path — read-only frontend |

**Type mapping (`Item` → DB row):**

| Prototype `Item` | Canonical listing |
|------------------|-------------------|
| `id` | `id` (uuid) |
| `title` | `title` |
| `imageUrl` | `photo_url` |
| `lat` / `lng` | `lat` / `lng` (nullable) |
| `location` / `district` | Replace with `zone` enum chip |
| `owner`, `category`, `condition` | Drop for scraped Phase 2 cards |
| — | `external_url`, `source`, `posted_at`, `expires_at` |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vite SPA tab state | Next.js App Router URL routes | Phase 2 (D-24) | Shareable `/listing/[id]` |
| Decorative map background | MapLibre + OpenFreeMap | Phase 2 (D-31) | Real geo pins |
| Mock localStorage items | Supabase anon reads | Phase 2 (D-37) | Live scraper data |
| Monolithic App.tsx state | RSC fetch + focused client hooks | Phase 2 | Scales to auth/i18n later |
| shadcn Drawer on Vaul only | shadcn v4 Base UI drawer option | 2025–2026 | Verify which drawer API your shadcn init uses; vaul still valid via `npx shadcn add drawer` on classic template |

**Deprecated/outdated:**
- `next-pwa` — unmaintained; defer PWA to Serwist in later phase [.planning/research/STACK.md]
- Prototype `NavTab` routing — replace with Next routes (D-26)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Subito listing pages block all cross-origin iframes | WebView shell | Shell must rely on external CTA — already mitigated in plan |
| A2 | OpenFreeMap `liberty` style sufficient for Venice launch | Map provider | Fallback to MapTiler free tier (D-31) |
| A3 | `@supabase/ssr` 0.12.3 compatible with `@supabase/supabase-js` 2.110.x | Standard Stack | Pin versions together; follow Supabase Next.js guide if mismatch |
| A4 | Low listing volume makes full-table fetch acceptable | Data fetching | Need bbox/zone SQL if perf regresses (D-39 escape hatch) |
| A5 | shadcn init uses vaul-based Drawer (not Base UI-only) | Bottom sheet | Run `shadcn add drawer` and confirm component source |

## Open Questions

1. **Which OpenFreeMap style fits Stitch palette?**
   - What we know: `liberty`, `positron`, `bright`, `dark` available free [CITED: openfreemap.org].
   - Recommendation: Start with `positron` or `liberty` (light, minimal); tune in Claude's discretion.

2. **Pull-to-refresh mechanism?**
   - Recommendation: Manual refresh button in list header for MVP reliability; optional CSS overscroll later.

3. **Keep Vite prototype runnable during migration?**
   - Recommendation: Yes briefly for visual diff; delete before phase verification.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js, tooling | ✓ | v23.10.0 | Requires Node 18+; OK |
| npm | package install | ✓ | 11.4.2 | — |
| Supabase project (remote) | listing reads | ✓ (Phase 1) | Postgres + PostGIS | Blocker if missing — Phase 1 complete |
| Supabase CLI | local migration apply | ✗ | — | Apply migrations via Supabase Dashboard SQL or CI |
| `NEXT_PUBLIC_SUPABASE_*` env | Next app | ? | — | Add `.env.local`; document in README |
| pg_cron extension | expiry job | ? | — | Enable in Supabase Dashboard → Integrations → Cron |
| Vercel | deploy target | [ASSUMED] ✓ | — | Local `next dev` for dev |

**Missing dependencies with no fallback:**
- Supabase anon URL/key in Next env (must configure before any UI fetch)

**Missing dependencies with fallback:**
- Supabase CLI → Dashboard SQL editor for migrations 004/005

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 3.x (match scraper/) + @testing-library/react |
| Config file | none — Wave 0: `vitest.config.ts` at repo root for `lib/` + `components/` |
| Quick run command | `npx vitest run lib/listings lib/favorites` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-03 | Zone filter excludes wrong zone + null zone | unit | `npx vitest run lib/listings/filters.test.ts` | ❌ Wave 0 |
| SCRP-04 | Query builder requires active + future expires_at | unit | `npx vitest run lib/listings/queries.test.ts` | ❌ Wave 0 |
| DISC-06 | Favorites toggle persists UUID array | unit | `npx vitest run lib/favorites/storage.test.ts` | ❌ Wave 0 |
| DISC-01/02 | Map+sheet renders pins | component/e2e | Manual / Playwright later | ❌ defer |
| DISC-04/05 | Detail shell shows external CTA | component | `@testing-library/react` smoke | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run lib/listings lib/favorites`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full unit suite green; manual map+sheet+detail smoke on mobile Safari

### Wave 0 Gaps

- [ ] `vitest.config.ts` — root app test runner (scraper has its own)
- [ ] `lib/listings/filters.test.ts` — zone + expiry filter pure functions
- [ ] `lib/listings/queries.test.ts` — mock Supabase client, assert query predicates
- [ ] `lib/favorites/storage.test.ts` — localStorage toggle/prune
- [ ] `next.config.ts` — transpile maplibre if needed; env exposure

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No auth Phase 2 (D-49) |
| V3 Session Management | no | — |
| V4 Access Control | yes | Supabase RLS anon SELECT policy; no service role in browser |
| V5 Input Validation | yes | Zod for route params (`listing/[id]` UUID); query filters centralized |
| V6 Cryptography | no | No secrets in Phase 2 client beyond public anon key |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Over-fetching hidden listings | Information disclosure | RLS `status + expires_at`; app hides `zone IS NULL` |
| Service role key exposure | Elevation | Anon key only in `NEXT_PUBLIC_*`; service role stays in scraper worker |
| iframe clickjacking / XSS from Subito | Spoofing / Tampering | Restrictive `sandbox`; prefer external tab; no `allow-scripts` unless required |
| Open redirect via `external_url` | Tampering | Validate URL host allowlist (`subito.it`) before render/link |
| localStorage tampering | Tampering | Favorites are best-effort pre-auth; server validates IDs on fetch via RLS |

## Sources

### Primary (HIGH confidence — verified registry + official docs)
- npm registry — package versions (next 16.2.12, maplibre-gl 6.0.0, react-map-gl 8.1.1, vaul 1.1.2, etc.)
- [CITED: openfreemap.org/quick_start] — style URLs, MapLibre setup
- [CITED: github.com/visgl/react-map-gl maplibre map.md] — `react-map-gl/maplibre` import path
- [CITED: supabase.com/docs/guides/database/postgres/row-level-security] — GRANT + RLS policy pattern
- [CITED: supabase.com/docs/guides/cron/install] — pg_cron enablement

### Secondary (MEDIUM confidence — Context7 / cross-verified)
- Context7 `/vercel/next.js/v16.2.2` — App Router RSC fetch, Vite migration notes
- Context7 `/supabase/supabase` — RLS, pg_cron schedule examples
- Context7 `/maplibre/maplibre-gl-js` — GeolocateControl, clustering
- [CITED: ui.shadcn.com/docs/components/drawer] — vaul-based Drawer, snapPoints
- [CITED: github.com/emilkowalski/vaul] — `modal={false}`, snap points API

### Tertiary (LOW confidence — validate in implementation)
- [CITED: urlscan.io Subito scan] — `X-Frame-Options: SAMEORIGIN` on subito.it
- WebSearch — vaul pointer-events bugs, shadcn snap point height conflicts

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — npm versions verified; libraries locked in CONTEXT.md
- Architecture: **MEDIUM-HIGH** — clear migration path; Subito iframe limitation verified
- Pitfalls: **MEDIUM** — vaul+map interaction needs device QA

**Research date:** 2026-07-28
**Valid until:** 2026-08-28 (30 days — stable stack; re-check shadcn Drawer API if init changes)
