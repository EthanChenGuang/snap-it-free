# Phase 8: Subito Regalo URL Matrix — Research

**Researched:** 2026-08-05  
**Domain:** Subito multi-city/category scrape config, location schema, consumer filters  
**Confidence:** HIGH (codebase-verified); MEDIUM for Padova live geo yield (spike gate required)

## Summary

Phase 8 extends the Phase 6 admin `target_urls` model from three hardcoded Venice regalo URLs to an operator-managed **city × category matrix** (Venice + Padova × 17 slugs = 34 URLs). The matrix UI is a **generator only**; persistence stays in `scraper_sources.target_urls` (D-02). Downstream work spans four tiers: **admin** (matrix + validation), **worker/scraper** (multi-URL ingest, category parser fix, city/region columns, Padova geo), **database** (`city`/`region` columns + `listings_public` visibility rewrite), and **consumer** (Subito category chips, DB-backed badges, relaxed zone filter for Padova).

Codebase inspection surfaced one **blocking geo constraint** not explicit in CONTEXT: Venice-only lat/lng bounding boxes in `scraper/src/shared/schema.ts` and `scraper/src/subito/extract.ts` (`inVeniceBbox`: lat 45.0–45.7, lng 12.1–12.6). Padova coordinates (~45.41, ~11.88) fail this gate and are nulled at extraction and Zod validation. Phase plans **must** relax bbox validation per scrape city/region before Padova map pins can work (D-21, D-24).

The broken category parser (`extractCategoryFromSubitoUrl` matching `/regalo/` on detail URLs) explains why `listings.category` is effectively always null despite migration 018 columns existing. Fix: read the **first pathname segment** on detail URLs (`/arredamento-casalinghi/slug-id.htm`).

Consumer visibility requires coordinated changes: `listings_public` currently filters `zone is not null` (migration 007), and app queries **redundantly** apply `.not('zone', 'is', null)`. Client `filterByZone(..., 'All')` also excludes `zone = null` rows. All three must align with D-28/D-22.

**Primary recommendation:** Plan as **Wave 0 Padova spike gate → schema migration → scraper geo/parser → admin matrix → consumer filters**, with geo bbox relaxation as an early scraper task gated on spike findings. Keep Standard anti-block preset with `minConcurrency: 1` (already default in `presets.ts`); expect longer runs for 34 URLs (D-11, D-20).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Admin URL Matrix UX
- **D-01:** Hybrid matrix — city + category checkboxes above `target_urls` textarea; Generate populates textarea; manual edit allowed
- **D-02:** URLs-only persistence — matrix is generator; `scraper_sources.target_urls` sole stored config
- **D-03:** Veneto regalo URL validation — allow `venezia` or `padova` paths matching `/annunci-veneto/regalo/{cat}/{city}/{city}/`
- **D-04:** "Apply recommended seed" — one click fills 34 URLs (17 × 2 cities)
- **D-05:** Custom URLs allowed — generated + manual lines coexist; save merges non-empty lines
- **D-06:** Dedupe on Generate and save
- **D-07:** Matrix defaults — Venice + Padova + all 17 categories checked on load
- **D-08:** Admin category labels — Italian catalog labels; slug in tooltip
- **D-09:** Preview — URL count + template hint only
- **D-10:** Future-region hint — static note for `annunci-{region}/…`; no region picker
- **D-11:** High URL count warning when ≥30 URLs (non-blocking)

#### Initial Seed
- **D-12:** Admin button only — no SQL auto-seed of 34 URLs
- **D-13:** Keep 3-URL code fallback in `categories.ts` until operator saves from admin
- **D-14:** Confirm on overwrite when applying recommended seed
- **D-15:** Padova spike gate before Padova URLs ship in recommended seed constant

#### Category Scope (Scraper)
- **D-16:** Full 17-slug catalog in v1 seed including `animali` and `usato`
- **D-17:** Store Subito slug in `listings.category`; Italian label from catalog map
- **D-18:** Fix `extractCategoryFromSubitoUrl()` — detail path slug, not `/regalo/` segment
- **D-19:** `usato` overlap dedupe via existing `external_url` dedupe only
- **D-20:** Single worker, Standard preset, low concurrency (minConcurrency 1–2)

#### Padova & Location Schema
- **D-21:** Padova on consumer map when `lat`/`lng` resolved (`zone = null` OK)
- **D-22:** Zone "All" includes Venice-zoned + zone-null with coords; Venice zone chips Venice-only
- **D-23:** Venice-centered map default; no fit-all bounds
- **D-24:** Coords required for map pin — no city-centroid fallback
- **D-25:** Add `city` text column — from scrape URL path (`venezia`, `padova`)
- **D-26:** Add `region` text column — from URL (`veneto` from `annunci-veneto`)
- **D-27:** City label on cards when `zone` is null

#### Consumer Visibility
- **D-28:** `listings_public` includes `zone IS NOT NULL` OR (`city IS NOT NULL` AND coords present)

#### Category in Consumer App
- **D-29:** DB `category` slug primary; title inference fallback only
- **D-30:** 17 Subito slug chips + "Tutte" default
- **D-31:** Category i18n via ingest translate → `category_en` / `category_zh`

### Claude's Discretion
- **D-20** scrape concurrency tuning (Standard preset, minConcurrency 1–2)

### Deferred Ideas (OUT OF SCOPE)
- Multi-worker parallel scraping
- National region picker UI
- Padova zone polygons
- Pagination / multi-page crawl (`?o=` disallowed)
- Category filter "remember last selection"
- Map fit-all bounds when Padova pins exist
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRP-01 (extended) | Subito ingest from configurable Veneto/Venice+Padova regalo URLs | Matrix → `target_urls`; config-loader merge; crawler multi-URL; Padova spike + geo fix |
| Phase 6 D-18 | Worker loads `scraper_sources.target_urls` each run | Existing `loadSourceConfig` / `mergeTargetUrls`; extend URL count only |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL matrix UI + seed/generate | Browser (Admin `/admin`) | API Route Handler PATCH | Operator-facing; persists via existing `/api/admin/sources/subito` |
| URL validation (Venice/Padova) | API / Backend | — | `validateTargetUrls` in PATCH path before DB write |
| Recommended 34-URL constant | Shared lib (`lib/admin/`) | Admin UI imports | Single source for seed button + tests; scraper does not auto-seed |
| Worker URL load + crawl | Scraper worker | Supabase `scraper_sources` | D-18: config at run start; Crawlee accepts URL array |
| Category slug parse | Scraper (normalize) | — | Detail `external_url` shape; not consumer/admin |
| City/region at ingest | Scraper (normalize/persist) | — | Derived from category listing URL context |
| Geo coords for Padova | Scraper (extract) | — | Subito detail embed + bbox rules; no consumer derivation |
| `city`/`region` columns + view | Database / Storage | Migration SQL | D-25/D-26/D-28; `listings_public` security definer |
| Consumer category chips + filter | Browser / Client | Optional server query columns | Client filter on `category` slug; extend `ListingRow` select |
| Zone "All" + Padova inclusion | Browser / Client | View + query alignment | `filterByZone` + remove redundant `.not('zone')` |
| Category badge + i18n display | Browser / Client | Ingest translate (worker) | `resolveListingCategory` helper mirroring title resolver |
| Padova spike gate | Scraper scripts (Wave 0) | — | Playwright verification before seed ships Padova URLs |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | (project) | Admin + consumer routes | Existing `/admin/sources/[slug]`, `/list`, map |
| Supabase JS | ^2.110.9 (app) / ^2.49.0 (scraper) | Config + listings persistence | Phase 6 control plane |
| Crawlee + Playwright | ^3.12.0 / ^1.62.0 | Multi-URL Subito crawl | Already wired in `runSubitoCrawler` |
| Zod | ^3.24.0 | Canonical listing + admin PATCH schemas | Extend for city-aware geo if needed |
| Vitest | ^3.0.0 | Unit tests (root + scraper) | Nyquist sampling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix Dialog | ^1.1.23 | Seed overwrite confirm modal | `ReplaceUrlsConfirmDialog` per UI-SPEC |
| `@turf/boolean-point-in-polygon` | ^7.3.5 | Venice zone tagging | Unchanged; Padova stays `zone = null` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URLs-only persistence (D-02) | Matrix JSON column | Rejected — locked decision |
| Client-side category filter | Server `.eq('category', slug)` | Client OK for MVP poll size; server filter if perf issues |
| Venice bbox expansion | Per-city bbox map | **Recommend per-city** — UGC Venice bounds stay tight |

**Installation:** No new npm packages required for Phase 8 core scope.

**Version verification:** Existing packages confirmed in root `package.json` and `scraper/package.json` [VERIFIED: codebase grep].

## Package Legitimacy Audit

> Phase 8 adds **no new external packages**. Existing crawl stack already vetted in Phase 1/6.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| (none new) | — | — | Approved — code-only phase |

**Packages removed due to [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Project Constraints (from `.cursor/rules/`)

- All user-facing UI MUST follow `.planning/google-stitch-ui-design/` — read DESIGN.md + phase08 prototypes before UI work [VERIFIED: `.cursor/rules/stitch-ui-design.mdc`]
- Monochrome document-first; thin borders; no card drop shadows; Inter + Material Symbols Outlined
- Use `@theme` tokens from `app/globals.css` — not default shadcn theme
- Phase 8 UI contract: `08-UI-SPEC.md` (approved 2026-08-05) — admin matrix, confirm modal, map + Elenco category chips
- Admin chrome: Chinese; matrix category labels: Italian; consumer chips: Italian default + i18n columns

## Architecture Patterns

### System Architecture Diagram

```
Operator (/admin/sources/subito)
    │
    ├─ RegaloUrlMatrix ──Generate/Seed──► target_urls[] (textarea state)
    │
    └─ Save ──PATCH──► /api/admin/sources/subito
              │           validateTargetUrls (venezia|padova)
              └──────────► scraper_sources.target_urls (Supabase)

Worker (each run — D-18)
    │
    ├─ loadSourceConfig('subito') ──► mergeTargetUrls(DB, SUBITO_CATEGORY_URLS fallback)
    │
    ├─ runSubitoCrawler(urls[], Standard preset)
    │       │
    │       └─ per category URL ──► extractListingsFromPage
    │               ├─ attach source_category_url (NEW — planner)
    │               └─ detail pages ──► RawListing[]
    │
    ├─ normalizeRawListing (+ city/region/category from URL context)
    │
    └─ persistListing ──► listings (+ category, city, region, translations)

Consumer
    │
    ├─ listings_public view (zone OR city+coords)
    │
    ├─ getActiveListings / poll (no redundant zone filter)
    │
    ├─ filterByZone (All includes zone-null+coords)
    │
    └─ SubitoCategoryFilterChips ──► filter listing.category slug
```

### Recommended Project Structure

```
lib/admin/
├── subito-regalo-catalog.ts      # 17 slugs, Italian labels, URL builder, dedupe
├── subito-recommended-seed.ts    # 34-URL constant (Padova gated post-spike)
└── url-validate.ts               # extend for padova paths

lib/listings/
├── subito-categories.ts          # slug → label + i18n resolver
├── filters.ts                    # D-22 zone All behavior
├── queries.ts / client-queries.ts # add columns; drop .not('zone')
└── types.ts                      # category, city, region fields

components/admin/
├── RegaloUrlMatrix.tsx
├── ReplaceUrlsConfirmDialog.tsx
└── SourceDetailClient.tsx        # insert matrix above textarea

components/listings/
├── SubitoCategoryFilterChips.tsx # shared map + Elenco
├── ListPageClient.tsx
├── ListListingCard.tsx
└── ListingCard.tsx

scraper/src/subito/
├── normalize.ts                  # fix extractCategoryFromSubitoUrl
├── url-context.ts                # parse region/city/category from category URL (NEW)
├── extract.ts                    # relax inVeniceBbox for Padova / Veneto
└── categories.ts                 # keep 3-URL fallback (D-13)

scraper/scripts/
└── spike-subito-padova.mjs       # Wave 0 gate (D-15)

supabase/migrations/
└── 020_subito_location_category.sql  # city, region, listings_public rewrite
```

### Pattern 1: Shared Subito Regalo Catalog

**What:** Single constant array `{ slug, labelIt }` × 17 entries used by admin matrix, recommended seed, consumer chips, and ingest label translation input.

**When to use:** Any UI or validation referencing Subito regalo categories.

**Example:**

```typescript
// lib/admin/subito-regalo-catalog.ts — pattern from 08-UI-SPEC.md catalog table
export const SUBITO_REGALO_CATALOG = [
  { slug: 'arredamento-casalinghi', labelIt: 'Arredamento e Casalinghi' },
  // ... 17 entries
] as const;

export function buildRegaloCategoryUrl(
  region: 'veneto',
  slug: string,
  city: 'venezia' | 'padova',
): string {
  return `https://www.subito.it/annunci-${region}/regalo/${slug}/${city}/${city}/`;
}

export function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}
```

### Pattern 2: Category Parser Fix (D-18)

**What:** Detail listing URLs carry category as **first path segment**, not `/regalo/`.

**Verified broken behavior:** `scraper/src/subito/normalize.ts` regex `/\/regalo\/([^/]+)/` returns null for  
`https://www.subito.it/arredamento-casalinghi/accessori-camera-da-letto-venezia-655558887.htm` [VERIFIED: codebase].

**Example:**

```typescript
export function extractCategoryFromSubitoUrl(externalUrl: string): string | null {
  try {
    const { pathname } = new URL(externalUrl);
    const segments = pathname.split('/').filter(Boolean);
    // Detail: /{category}/{listing-slug}.htm
    if (segments.length >= 2 && segments[1]?.includes('.htm')) {
      return segments[0] ?? null;
    }
    // Category listing fallback: /annunci-veneto/regalo/{cat}/...
    const regaloMatch = pathname.match(/\/regalo\/([^/]+)/i);
    return regaloMatch?.[1] ?? null;
  } catch {
    return null;
  }
}
```

### Pattern 3: City/Region from Category URL

**What:** Parse scrape context from admin URL template `/annunci-veneto/regalo/{slug}/{city}/{city}/`.

**Example:**

```typescript
export function parseRegaloCategoryUrl(url: string): {
  region: string;
  city: string;
  categorySlug: string;
} | null {
  try {
    const { pathname } = new URL(url);
    const m = pathname.match(
      /^\/annunci-([^/]+)\/regalo\/([^/]+)\/([^/]+)\/\3\/?$/i,
    );
    if (!m) return null;
    return { region: m[1].toLowerCase(), categorySlug: m[2], city: m[3].toLowerCase() };
  } catch {
    return null;
  }
}
```

**Integration:** Pass `sourceCategoryUrl` from crawler request URL into `RawListing`, then `normalizeRawListing` sets `city`/`region` on canonical row and persist.

### Pattern 4: listings_public Visibility (D-28)

**Example migration shape:**

```sql
create or replace view public.listings_public
with (security_invoker = false) as
select
  id, source, title, title_en, title_zh,
  photo_url, external_url, lat, lng, zone,
  city, region, category, category_en, category_zh,
  posted_at, expires_at, status
from public.listings
where (
  (status = 'active' and expires_at > now())
  or (status = 'claimed' and source = 'ugc' and expires_at > now())
)
and (
  zone is not null
  or (city is not null and lat is not null and lng is not null)
);
```

Keep `security_invoker = false` per migration 010 [VERIFIED: `010_listings_public_security_definer.sql`].

### Anti-Patterns to Avoid

- **Storing matrix state in DB:** Violates D-02
- **SQL seed of 34 URLs:** Violates D-12
- **Title keyword filter as primary:** Violates D-29
- **Adding Padova to Venice zone enum:** Out of scope; use `city` + coords
- **Using `?o=` pagination:** Disallowed by robots.txt [VERIFIED: `SPIKE-NOTES.md`]
- **curl-only Padova spike:** Returns 403 without browser UA [VERIFIED: session curl probe]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-URL crawl queue | Custom fetch loop | Crawlee `PlaywrightCrawler.run(urls)` | Session pool, retries, proxy already wired |
| URL deduplication | Ad-hoc Set logic scattered | Shared `dedupeUrls()` in catalog module | D-06 — one implementation for Generate + Save |
| Category label map | Inline chip strings | `SUBITO_REGALO_CATALOG` + `getSubitoCategoryLabel(slug, locale)` | D-08/D-30/D-31 single catalog |
| Admin URL validation | Duplicate regex in UI | Extend `lib/admin/url-validate.ts` | PATCH route already calls it |
| Venice zone tagging | Padova polygons | Leave `zone = null`; use `city` column | D-21/D-22 locked |
| External_url dedupe | usato-specific logic | Existing `persistListing` upsert by `(source, external_id)` | D-19 |

**Key insight:** Phase 8 is mostly **wiring and schema** around existing Phase 6 admin + Phase 1 scraper — avoid new persistence or crawl frameworks.

## Subito URL Matrix / Category Catalog Specifics

### 17 Verified Regalo Slugs (2026-08-05 recon)

| Italian label | Slug |
|---------------|------|
| Arredamento e Casalinghi | `arredamento-casalinghi` |
| Elettrodomestici | `elettrodomestici` |
| Tutto per i bambini | `bambini-giocattoli` |
| Abbigliamento e Accessori | `abbigliamento-accessori` |
| Libri e Riviste | `libri-riviste` |
| Informatica | `informatica` |
| Giardino e Fai da te | `giardino-fai-da-te` |
| Sports | `sport` |
| Collezionismo | `hobby-collezionismo` |
| Biciclette | `biciclette` |
| Audio/Video | `audio-video` |
| Telefonia | `telefonia` |
| Musica e Film | `musica-film` |
| Fotografia | `fotografia` |
| Console e Videogiochi | `videogiochi` |
| Animali | `animali` |
| Tutte le categorie | `usato` |

**URL template:** `https://www.subito.it/annunci-veneto/regalo/{slug}/{city}/{city}/`  
**Cities v1:** `venezia/venezia`, `padova/padova`  
**Recommended seed count:** 34 (17 × 2)

### Current Fallback (D-13)

```3:7:scraper/src/subito/categories.ts
export const SUBITO_CATEGORY_URLS = [
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
  'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/venezia/venezia/',
  'https://www.subito.it/annunci-veneto/regalo/bambini-giocattoli/venezia/venezia/',
] as const;
```

### Validation Extension (D-03)

Current blocker in `lib/admin/url-validate.ts`:

```34:36:lib/admin/url-validate.ts
  if (slug === 'subito' && !parsed.pathname.includes('venezia')) {
    return { ok: false, error: 'Subito URLs must be Venice-scoped (venezia path)' };
  }
```

Replace with regex matching `/annunci-veneto/regalo/{cat}/(venezia|padova)/(venezia|padova)/` and HTTPS + subito.it host (existing checks).

## Schema Migration Approach

### New columns (migration ~020)

```sql
alter table public.listings
  add column if not exists city text,
  add column if not exists region text;

create index if not exists listings_city_idx
  on public.listings (city) where status = 'active';

create index if not exists listings_category_idx
  on public.listings (category) where status = 'active';
```

- **`city` / `region`:** free text (D-25/D-26) — not enums; supports future national expansion without migration
- **`category`:** already exists from migration 018 [VERIFIED: `018_scraper_admin.sql`]
- **Backfill:** Optional one-time UPDATE for existing Venice rows (`city = 'venezia'`, `region = 'veneto'`) from `external_url` or manual SQL — not required for forward ingest

### listings_public view

- Add columns: `city`, `region`, `category`, `category_en`, `category_zh`, translation title columns if not already exposed
- Replace visibility predicate per D-28
- Preserve UGC claimed visibility rule from migration 007
- Re-apply `security_invoker = false` after `CREATE OR REPLACE VIEW`

### App type + query updates

Extend `ListingRow` and `ACTIVE_LISTING_COLUMNS` in `lib/listings/types.ts`, `queries.ts`, `client-queries.ts`.

Remove redundant `.not('zone', 'is', null)` — view handles visibility; double-filter currently hides Padova even after view fix.

### Scraper schema

Extend `CanonicalListingSchema` with optional `city`, `region` strings; **relax lat/lng bounds** to Veneto-wide or city-keyed validation:

| City | Approx bbox (planner discretion) |
|------|----------------------------------|
| venezia | lat 45.0–45.7, lng 12.1–12.6 (existing) |
| padova | lat 45.3–45.5, lng 11.7–12.0 [ASSUMED — verify in spike] |

UGC create schema (`lib/ugc/schemas.ts`) stays Venice-only — out of Phase 8 scope.

## Admin Matrix UI Integration Points

| Touchpoint | File | Action |
|------------|------|--------|
| Matrix panel | `components/admin/RegaloUrlMatrix.tsx` | **Create** — cities, 17-check grid, generate, seed, preview, warning |
| Confirm modal | `components/admin/ReplaceUrlsConfirmDialog.tsx` | **Create** — D-14 overwrite |
| Page integration | `components/admin/SourceDetailClient.tsx` | Insert matrix **above** textarea (lines ~230–242 today) |
| Catalog + URL builder | `lib/admin/subito-regalo-catalog.ts` | **Create** |
| Recommended seed | `lib/admin/subito-recommended-seed.ts` | **Create** — export `RECOMMENDED_SUBITO_SEED_URLS` |
| Validation | `lib/admin/url-validate.ts` | Padova path allow |
| API | `app/api/admin/sources/[slug]/route.ts` | No schema change; dedupe in UI before PATCH optional |
| Save dedupe | `SourceDetailClient.handleSave` | Dedupe lines before JSON body (D-06) |

**Generate merge semantics (D-05):** Generated URLs first, then unique manual lines not in generated set (per UI-SPEC).

**Existing PATCH flow** already validates URLs and persists `target_urls` array [VERIFIED: `route.ts` lines 69–74].

## Scraper / Parser Fixes

| Issue | Location | Fix |
|-------|----------|-----|
| Category always null on ingest | `scraper/src/subito/normalize.ts` | D-18 first-segment parser |
| Category set in normalize | `scraper/src/shared/normalize.ts` | Pass through; add city/region |
| Venice-only bbox nulls Padova coords | `scraper/src/subito/extract.ts` `inVeniceBbox` | City-aware bbox using parsed city or `sourceCategoryUrl` |
| No Padova centroids | `municipality-centroids.json` | Do **not** add city-centroid fallback (D-24); only use embedded coords |
| Missing scrape context | `extract.ts` / `crawler.ts` | Attach category page URL to each `RawListing` |
| Persist city/region | `scraper/src/shared/persist.ts` | Add columns to insert/update row |
| Translation category | `scraper/src/translate/ingest.ts` | Already accepts `category` — pass Italian label from catalog map |
| Concurrency | `scraper/src/admin/presets.ts` | Standard already `minConcurrency: 1`; optionally cap maxConcurrency for 34 URLs |

**Crawler volume:** 34 category URLs × ~30 detail extractions each ≈ long run. D-11 warning + Standard preset appropriate. Single `crawler.run([...urls])` remains correct [VERIFIED: `crawler.ts`].

## Consumer Elenco / Map Filter Chips

| Component | Change |
|-----------|--------|
| `SubitoCategoryFilterChips.tsx` | **Create** — 18 chips (Tutte + 17), shared |
| `FloatingMapSearch.tsx` | Add Row 2 category panel per UI-SPEC |
| `MapExplorer.tsx` | `selectedCategory` state; AND with zone filter |
| `ListPageClient.tsx` | Replace `CategoryFilterChips` + title inference with DB slug filter |
| `ListListingCard.tsx` / `ListingCard.tsx` | Badge from `listing.category`; location = zone OR `city` |
| `lib/listings/filters.ts` | D-22: `filterByZone(All)` includes `zone != null OR (zone == null && coords)` |
| `lib/listings/categories.ts` | Keep `inferListingCategory` as fallback export only |

**i18n (D-31):** Add `resolveListingCategory(row, locale)` parallel to `resolveListingTitle` in `lib/i18n/listing-fields.ts`.

**Alerts:** Zone-based alerts (`lib/alerts/matcher.ts`) remain Venice-zone-only — Padova listings match keyword-only alerts; no Phase 8 change required [VERIFIED: codebase].

## Padova Spike Gate Findings Approach (D-15)

### Objective

Verify `https://www.subito.it/annunci-veneto/regalo/{slug}/padova/padova/` returns **200 + listing cards** and sample detail pages yield **usable coords** before Padova URLs appear in `RECOMMENDED_SUBITO_SEED_URLS`.

### Method (mirror `spike-subito-geo.mjs`)

1. Add `scraper/scripts/spike-subito-padova.mjs` using Playwright headless Chromium
2. Test 2–3 slugs (`informatica`, `arredamento-casalinghi`, `usato`)
3. Record per URL: HTTP success, `article` count, sample detail `external_url`
4. On 2 detail pages: run `resolveCoords` with **proposed** Padova bbox; report lat/lng source
5. Emit markdown/json artifact under `.planning/phases/08-…/` or `scraper/src/subito/SPIKE-NOTES.md` appendix

### Gate criteria (recommended for planner)

| Check | Pass |
|-------|------|
| Category page loads (not blocked title) | ≥2/3 slugs |
| Listing cards | ≥1 article per passing slug |
| Detail coords | ≥1 Padova listing with non-null lat/lng inside Padova bbox |

### Session findings

- Raw `curl -I` to Padova category URLs returned **403** [VERIFIED: session probe] — spike **must** use Playwright + cookie banner dismiss (existing pattern in `extract.ts`)
- `municipality-centroids.json` has **no Padova** entry [VERIFIED: file read] — coord dependence on Subito embeds

### Recommended seed gating

```typescript
// lib/admin/subito-recommended-seed.ts
const VENEZIA_URLS = /* 17 URLs */;
const PADOVA_URLS = /* 17 URLs — import only after spike PASS */;

export const RECOMMENDED_SUBITO_SEED_URLS = [...VENEZIA_URLS, ...PADOVA_URLS];
```

Planner: Wave 0 spike task blocks Padova half of seed constant until PASS documented.

## Common Pitfalls

### Pitfall 1: Venice Bbox Silently Drops Padova Coords

**What goes wrong:** Listings ingest but `lat`/`lng` null → no map pin, may fail D-28 visibility if coords required.  
**Why:** `inVeniceBbox` and Zod schema lng min 12.1 [VERIFIED: `schema.ts`, `extract.ts`].  
**How to avoid:** City-aware bbox in extract + separate Zod refinement keyed on `city`.  
**Warning signs:** Padova rows in DB with `city='padova'` but null coords after spike showed embed coords.

### Pitfall 2: Triple Zone Filter Hides Padova

**What goes wrong:** View updated but queries/filters still exclude `zone = null`.  
**Why:** `listings_public` view **and** `.not('zone')` **and** `filterByZone(All)` [VERIFIED: `queries.ts`, `filters.ts`].  
**How to avoid:** Change all three in same plan wave; add regression test for zone-null+coords in `filterByZone`.

### Pitfall 3: Category Parser Fixed but Not Backfilled

**What goes wrong:** Old listings lack `category`; chips filter empty.  
**Why:** Parser runs at ingest only.  
**How to avoid:** Accept fallback inference for legacy rows (D-29); optional backfill script out of scope unless operator requests.

### Pitfall 4: Matrix Generate Overwrites Manual URLs Incorrectly

**What goes wrong:** Operator loses custom URLs.  
**Why:** Wrong merge order.  
**How to avoid:** Generated first, then unique manual lines (UI-SPEC D-05).

### Pitfall 5: 34-URL Run Triggers Soft-Block

**What goes wrong:** validate-run fails selector/geo thresholds.  
**Why:** Volume + anti-bot.  
**How to avoid:** Standard preset, minConcurrency 1, monitor scrape_runs; operator can reduce matrix selection.

## Code Examples

### Extend filterByZone for D-22

```typescript
// lib/listings/filters.ts
export function filterByZone(listings: ListingRow[], zoneChip: ZoneChip): ListingRow[] {
  if (zoneChip === 'All') {
    return listings.filter(
      (l) => l.zone != null || (l.zone == null && l.lat != null && l.lng != null),
    );
  }
  return listings.filter((l) => l.zone === zoneChip);
}
```

### Admin validation (D-03)

```typescript
const SUBITO_REGALO_PATH =
  /^\/annunci-veneto\/regalo\/[^/]+\/(venezia|padova)\/(venezia|padova)\/?$/i;

if (slug === 'subito' && !SUBITO_REGALO_PATH.test(parsed.pathname)) {
  return { ok: false, error: 'Subito URLs must match Veneto regalo city template' };
}
```

### Consumer category filter

```typescript
function matchesSubitoCategory(listing: ListingRow, selected: string | 'all'): boolean {
  if (selected === 'all') return true;
  if (listing.category) return listing.category === selected;
  return inferListingCategory(listing.title) === legacyMap(selected); // fallback only
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3 hardcoded Venice URLs | DB `target_urls` + matrix generator | Phase 8 | 34 URL operability |
| Title keyword categories | DB `category` slug | Phase 8 | Accurate Subito chips |
| Venice-only public listings | zone OR city+coords | Phase 8 | Padova visibility |
| `/regalo/` category parse | First path segment on detail URL | Phase 8 | Populated `category` column |

**Deprecated/outdated:**
- `CategoryFilterChips` generic furniture/tech buckets for Subito filtering — replace with `SubitoCategoryFilterChips`
- Venice-only check in `url-validate.ts`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Padova detail pages expose embed coords at similar rate to Venice | Padova spike | List-only Padova items; D-21 partial fail |
| A2 | Padova bbox ~45.3–45.5 lat, 11.7–12.0 lng sufficient | Schema migration | Valid coords rejected by Zod |
| A3 | Subito `/padova/padova/` comune form mirrors Venice URL structure | Catalog | Spike fails; need province-level form B from SPIKE-NOTES |
| A4 | Client-side category filter performant at ~few hundred listings | Consumer | Need server-side `.eq('category')` |
| A5 | Radix Dialog overlay click dismisses without replace (UI-SPEC unresolved) | Admin modal | Minor UX — match 保留当前 URL behavior |

## Open Questions (RESOLVED)

1. **Backfill existing listings with city/region/category?** — RESOLVED: Deferred to optional admin maintenance task; forward ingest populates new rows; not blocking Phase 8 MVP (08-03 scope).

2. **Exact Padova geo bbox constants** — RESOLVED: Derive from Padova spike sample coords + 0.1° padding in 08-01 Task 3; constants land in `scraper/src/subito/extract.ts` `PADOVA_BBOX`.

3. **Expose `category` on listings_public before consumer deploy** — RESOLVED: Yes — migration 020 (08-02) adds `city`, `region`, and ensures `category` visible in view rewrite before 08-05 consumer deploy.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | scraper + tests | ✓ | (project) | — |
| Playwright | Padova spike + crawler | ✓ | ^1.62.0 | Spike blocks Padova seed |
| Supabase | migrations + worker | ✗/env | — | Local dev without persist |
| curl/wget | Padova probe | ✓ | — | Unreliable (403); use Playwright |
| Italian IP / proxy | Subito anti-bot | optional | PROXY_URL | Conservative preset; fewer URLs |

**Missing dependencies with no fallback:**
- Supabase credentials for end-to-end ingest verification (operator env)

**Missing dependencies with fallback:**
- Proxy — reduce URL count or run Venice-only until configured

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `vitest.config.ts` (app), `scraper/vitest.config.ts` (worker) |
| Quick run command | `npm test` (app lib tests) |
| Full suite command | `npm test && cd scraper && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRP-01 ext | Padova URL validation accepts/regects | unit | `npm test -- lib/admin/url-validate.test.ts -x` | ✅ extend |
| SCRP-01 ext | Category parser detail URL | unit | `cd scraper && npm test -- src/subito/normalize.test.ts -x` | ❌ Wave 0 |
| SCRP-01 ext | URL builder 17×2 dedupe | unit | `npm test -- lib/admin/subito-regalo-catalog.test.ts -x` | ❌ Wave 0 |
| SCRP-01 ext | Regalo category URL parse | unit | `npm test -- lib/admin/subito-regalo-catalog.test.ts -x` | ❌ Wave 0 |
| D-28/D-22 | filterByZone All includes zone-null+coords | unit | `npm test -- lib/listings/filters.test.ts -x` | ✅ extend |
| D-29 | Category chip match prefers DB slug | unit | `npm test -- lib/listings/subito-categories.test.ts -x` | ❌ Wave 0 |
| D-15 | Padova spike 200 + listings | integration | `node scraper/scripts/spike-subito-padova.mjs` | ❌ Wave 0 |
| D-18 | Queries don't double-filter zone | unit | `npm test -- lib/listings/queries.test.ts -x` | ✅ extend |

### Sampling Rate

- **Per task commit:** `npm test` (app) + targeted scraper test file
- **Per wave merge:** `npm test && cd scraper && npm test`
- **Phase gate:** Full suite green + Padova spike artifact PASS before Padova seed enabled

### Wave 0 Gaps

- [ ] `scraper/scripts/spike-subito-padova.mjs` — D-15 gate
- [ ] `scraper/src/subito/normalize.test.ts` — D-18 parser cases
- [ ] `lib/admin/subito-regalo-catalog.test.ts` — URL builder + dedupe
- [ ] `lib/listings/subito-categories.test.ts` — label + filter helper
- [ ] Extend `lib/admin/url-validate.test.ts` — Padova paths
- [ ] Extend `lib/listings/filters.test.ts` — D-22 All behavior
- [ ] Extend `lib/listings/queries.test.ts` — remove zone-not-null expectation
- [ ] Migration `020_subito_location_category.sql`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | Existing operator session |
| V3 Session Management | no change | Supabase Auth |
| V4 Access Control | yes | Operator-only PATCH; RLS on `scraper_sources` |
| V5 Input Validation | yes | `validateTargetUrls` + Zod PATCH schema; HTTPS-only URLs |
| V6 Cryptography | no change | Proxy encryption unchanged |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via malicious target URL | Tampering | Host allowlist `subito.it` only [VERIFIED: `url-validate.ts`] |
| Open redirect in external listing URLs | Spoofing | Existing `isAllowedExternalUrl` on consumer detail |
| Operator saves oversized URL list | DoS | Reasonable line count UI warning (D-11); worker timeout |
| XSS in matrix textarea | Tampering | URLs validated as HTTPS; no HTML render of raw URLs |

## Sources

### Primary (HIGH confidence)

- Phase 8 `08-CONTEXT.md`, `08-UI-SPEC.md` — locked decisions + UI contract
- `scraper/src/subito/SPIKE-NOTES.md` — URL forms, DOM selectors, Venice geo recon
- Codebase files cited above — validation, queries, normalize, persist, presets

### Secondary (MEDIUM confidence)

- ROADMAP Phase 8 success criteria — `.planning/ROADMAP.md`
- Phase 6 D-18 target_urls — `06-CONTEXT.md`

### Tertiary (LOW confidence)

- Padova bbox numeric constants — pending spike (Assumption A2)
- Padova category page listing counts — pending Playwright spike

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing Crawlee/admin path
- Architecture: HIGH — codebase touchpoints mapped and verified
- Pitfalls: HIGH — Venice bbox + triple zone filter confirmed in code
- Padova geo yield: MEDIUM — requires Wave 0 spike

**Research date:** 2026-08-05  
**Valid until:** 2026-09-05 (30 days; Subito DOM stable but anti-bot volatile)

## RESEARCH COMPLETE
