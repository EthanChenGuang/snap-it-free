# Phase 01: Scraper Foundation & Listing Data Model - Pattern Map

**Mapped:** 2026-07-26
**Files analyzed:** 32
**Analogs found:** 0 / 32 (greenfield — conventions established from research)

## Greenfield Status

No application code exists in the repository. All patterns below are **conventions to establish** on first implementation, sourced from `01-RESEARCH.md`, `01-CONTEXT.md`, `.planning/research/ARCHITECTURE.md`, and `.planning/research/STACK.md`. The planner should treat RESEARCH code examples as the canonical templates, not copy from non-existent files.

### Cross-Cutting Conventions (apply to all scraper files)

| Convention | Rule |
|------------|------|
| **Package boundary** | `scraper/` is a separate deployable with its own `package.json`; never import scraper code from a future `app/` |
| **Module layout** | `fetch/` (Crawlee) → `extract/` (DOM) → `normalize/` (Zod + filter + zone) → `validate/` (batch gate) → `persist/` (Supabase) |
| **Imports** | ESM with `.js` extension in relative imports (NodeNext/ESM TS); path alias optional but not required in Phase 1 |
| **Secrets** | All credentials via `process.env` loaded by `dotenv`; service role key worker-only; `.env` in `.gitignore` |
| **Error handling** | Zod `.parse()` throws on invalid shape; persist errors propagate to worker; batch validation failures skip all listing writes |
| **Testing** | Vitest 3.x; unit tests co-located as `*.test.ts`; run via `cd scraper && npx vitest run` |

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/001_enable_postgis.sql` | migration | transform | — | none (greenfield) |
| `supabase/migrations/002_listings_schema.sql` | migration | CRUD | — | none |
| `supabase/migrations/003_scrape_audit_tables.sql` | migration | CRUD | — | none |
| `scraper/package.json` | config | — | — | none |
| `scraper/tsconfig.json` | config | — | — | none |
| `scraper/vitest.config.ts` | config | — | — | none |
| `scraper/Dockerfile` | config | — | — | none |
| `scraper/src/worker.ts` | route/hook | batch, event-driven | — | none |
| `scraper/src/config.ts` | config | — | — | none |
| `scraper/src/subito/crawler.ts` | service | streaming, request-response | — | none |
| `scraper/src/subito/extract.ts` | utility | transform | — | none |
| `scraper/src/subito/categories.ts` | config | — | — | none |
| `scraper/src/shared/schema.ts` | model | transform | — | none |
| `scraper/src/shared/normalize.ts` | service | transform | — | none |
| `scraper/src/shared/dedupe.ts` | utility | transform | — | none |
| `scraper/src/shared/zone-tag.ts` | utility | transform | — | none |
| `scraper/src/shared/validate-run.ts` | middleware | batch | — | none |
| `scraper/src/shared/persist.ts` | service | CRUD | — | none |
| `scraper/src/geo/*.geojson` | config | file-I/O | — | none |
| `scraper/src/alert/notify.ts` | service | event-driven | — | none |
| `docs/legal/subito-scraping-note.md` | config | — | — | none |
| `scraper/src/shared/schema.test.ts` | test | — | — | none |
| `scraper/src/shared/normalize.test.ts` | test | — | — | none |
| `scraper/src/shared/dedupe.test.ts` | test | — | — | none |
| `scraper/src/shared/zone-tag.test.ts` | test | — | — | none |
| `scraper/src/shared/validate-run.test.ts` | test | — | — | none |
| `scraper/src/subito/categories.test.ts` | test | — | — | none |

---

## Pattern Assignments

### Database Migrations (`supabase/migrations/`)

**Convention source:** `01-RESEARCH.md` § Code Examples — PostGIS Migration; D-06, D-08, D-09, D-11, D-18, D-20

**001_enable_postgis.sql** (migration, transform):

```sql
-- Source: supabase.com/docs/guides/database/extensions/postgis
create extension if not exists postgis with schema extensions;
```

**002_listings_schema.sql** (migration, CRUD):

```sql
create type listing_source as enum ('subito', 'facebook', 'ugc');
create type listing_status as enum ('active', 'claimed', 'expired', 'hidden');
create type venice_zone as enum ('centro_storico', 'mestre_marghera', 'lido_murano');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  source listing_source not null,
  external_id text not null,
  title text not null,
  photo_url text not null,
  external_url text not null,
  lat double precision,
  lng double precision,
  geom geography(point, 4326),
  zone venice_zone,
  status listing_status not null default 'active',
  posted_at timestamptz not null,
  scraped_at timestamptz not null default now(),
  expires_at timestamptz not null,
  content_hash text not null,
  raw_payload jsonb,
  unique (source, external_id)
);

create index listings_geom_idx on public.listings using gist (geom);
create index listings_zone_status_idx on public.listings (zone, status) where status = 'active';
create index listings_expires_at_idx on public.listings (expires_at) where status = 'active';
```

**003_scrape_audit_tables.sql** (migration, CRUD):

```sql
create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success', 'failed', 'partial')),
  listings_found int not null default 0,
  listings_inserted int not null default 0,
  listings_updated int not null default 0,
  listings_skipped int not null default 0,
  listings_rejected int not null default 0,
  failure_reason text,
  selector_hit_rate numeric(4,3)
);

create table public.scrape_rejects (
  id uuid primary key default gen_random_uuid(),
  scrape_run_id uuid references public.scrape_runs(id),
  external_id text,
  reject_reason text not null,
  raw_snippet jsonb not null,
  created_at timestamptz not null default now()
);
```

**Key rules:** Use `geography(point, 4326)` not `geometry`; GiST index on `geom`; partial indexes on active listings; `(source, external_id)` unique constraint (D-10).

---

### `scraper/src/worker.ts` (route/hook, batch + event-driven)

**Convention source:** `01-RESEARCH.md` § Architecture Diagram; D-02, D-19, D-20

**Orchestration pattern** — single entrypoint wiring the pipeline:

```typescript
// Establish: worker.ts owns run lifecycle, not individual modules
import { runSubitoCrawler } from './subito/crawler.js';
import { validateBatch } from './shared/validate-run.js';
import { persistBatch } from './shared/persist.js';
import { notifyOperator } from './alert/notify.js';
import { supabaseAdmin } from './config.js';

async function main() {
  const runId = await startScrapeRun(supabaseAdmin);
  try {
    const { rawListings, selectorHitRate } = await runSubitoCrawler();
    const validation = validateBatch(rawListings, await getTrailingMedians(), selectorHitRate);
    if (!validation.ok) {
      await finishScrapeRun(runId, { status: 'failed', failure_reason: validation.reason });
      await notifyOperator(`Scrape failed: ${validation.reason}`);
      return; // D-20: no listing writes on failure
    }
    const stats = await persistBatch(rawListings, runId);
    await finishScrapeRun(runId, { status: 'success', ...stats });
  } catch (err) {
    await finishScrapeRun(runId, { status: 'failed', failure_reason: String(err) });
    await notifyOperator(String(err));
    throw err;
  }
}
```

**Scheduling:** OS cron (`*/90 * * * *`) or `node-cron` in-process (D-02). Worker exports `main()`; Dockerfile CMD invokes it.

---

### `scraper/src/config.ts` (config)

**Convention source:** `01-RESEARCH.md` § Supabase Service-Role Client; D-07, D-04

```typescript
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const PROXY_URL = process.env.PROXY_URL!;
export const SCRAPE_MIN_SELECTOR_RATE = 0.9;
export const SCRAPE_MIN_COUNT_RATIO = 0.5;
export const TRAILING_RUN_WINDOW = 7;
```

**Key rules:** Fail fast on missing env at startup; never export service role to any future frontend bundle.

---

### `scraper/src/subito/crawler.ts` (service, streaming + request-response)

**Convention source:** `01-RESEARCH.md` § Pattern 1: Fetch/Extract Separation; D-03, D-05

**Fetch/infrastructure only** — no DOM parsing here:

```typescript
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { extractListingsFromPage } from './extract.js';
import { SUBITO_CATEGORY_URLS } from './categories.js';

const proxyConfiguration = new ProxyConfiguration({
  proxyUrls: [process.env.PROXY_URL!],
});

export async function runSubitoCrawler() {
  const rawListings: RawListing[] = [];
  let selectorHits = 0;
  let selectorTotal = 0;

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { maxPoolSize: 20 },
    maxRequestRetries: 3,
    async requestHandler({ page, session }) {
      const title = await page.title();
      if (title.toLowerCase().includes('blocked')) {
        session?.retire();
        return;
      }
      const { listings, hitRate } = await extractListingsFromPage(page);
      rawListings.push(...listings);
      selectorHits += hitRate.hits;
      selectorTotal += hitRate.total;
    },
  });

  await crawler.run(SUBITO_CATEGORY_URLS);
  return {
    rawListings,
    selectorHitRate: selectorTotal ? selectorHits / selectorTotal : 0,
  };
}
```

**Anti-patterns:** No `?o=` pagination URLs (robots.txt); no DB writes in crawler; no Zod parsing in crawler.

---

### `scraper/src/subito/extract.ts` (utility, transform)

**Convention source:** D-05, D-16, D-23 (spike-first)

**Pure DOM parsing** — receives Playwright `Page`, returns typed raw objects:

```typescript
import type { Page } from 'playwright';

export type RawListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  description?: string;
  raw_html_snippet?: string;
};

export async function extractListingsFromPage(page: Page): Promise<{
  listings: RawListing[];
  hitRate: { hits: number; total: number };
}> {
  // Selectors locked ONLY after D-23 spike — keep in this file only
  // D-16: parse lat/lng from map embed / JSON-LD first; municipality centroid fallback
  throw new Error('Implement after live spike');
}
```

**Key rules:** Structural selectors with fallback chain; track per-field resolution for SCRP-06 hit rate; zero knowledge of proxy/Supabase.

---

### `scraper/src/subito/categories.ts` (config)

**Convention source:** SCRP-01; A1 URL pattern

```typescript
// Target: /annunci-veneto/regalo/{category}/ — no ?o= pagination
export const SUBITO_CATEGORY_URLS = [
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/',
  'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/',
  'https://www.subito.it/annunci-veneto/regalo/bambini-giocattoli/',
  // extend after spike validates category slugs
] as const;
```

---

### `scraper/src/shared/schema.ts` (model, transform)

**Convention source:** `01-RESEARCH.md` § Pattern 2; D-11, D-13

```typescript
import { z } from 'zod';

export const ListingSource = z.enum(['subito', 'facebook', 'ugc']);
export const VeniceZone = z.enum(['centro_storico', 'mestre_marghera', 'lido_murano']);

export const CanonicalListingSchema = z.object({
  source: ListingSource,
  external_id: z.string().min(1),
  title: z.string().min(1).max(500),
  photo_url: z.string().url(),
  external_url: z.string().url(),
  lat: z.number().min(45.0).max(45.7).nullable(),
  lng: z.number().min(12.1).max(12.6).nullable(),
  zone: VeniceZone.nullable(),
  status: z.literal('active'),
  posted_at: z.coerce.date(),
  expires_at: z.coerce.date(),
  content_hash: z.string().length(64),
  raw_payload: z.record(z.unknown()).optional(),
});

export type CanonicalListing = z.infer<typeof CanonicalListingSchema>;
```

**Key rules:** Export inferred type; all DB-bound objects pass through `.parse()` before side effects.

---

### `scraper/src/shared/normalize.ts` (service, transform)

**Convention source:** D-12, D-17, D-18; `01-RESEARCH.md` § Italian Free-Listing Filter

**Pipeline:** raw → free-filter → geocode fallback → zone tag → Zod parse → canonical

```typescript
import { CanonicalListingSchema } from './schema.js';
import { isMislabeledFree } from './free-filter.js'; // inline or same file
import { tagZone, loadZonePolygons } from './zone-tag.js';
import { contentHash } from './dedupe.js';

const PRICE_PATTERNS = [
  /€\s*\d+/i, /\d+\s*€/i, /\beuro\b/i, /\bprezzo\b/i,
  /\btrattativa\b/i, /\bpagamento\b/i, /\bvend/i,
  /\ba pagamento\b/i, /\bnon gratis\b/i, /\d{2,}\s*(?:euro|€)/i,
];

export function isMislabeledFree(title: string, description?: string): string | null {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(text)) return `matched price pattern: ${pattern.source}`;
  }
  return null;
}

export function normalizeRawListing(raw: RawListing): CanonicalListing | { reject: string } {
  const rejectReason = isMislabeledFree(raw.title, raw.description);
  if (rejectReason) return { reject: rejectReason };

  const postedAt = new Date(raw.posted_at);
  const expiresAt = new Date(postedAt.getTime() + 48 * 60 * 60 * 1000); // D-12

  const zone = raw.lat && raw.lng
    ? tagZone(raw.lat, raw.lng, loadZonePolygons())
    : null; // D-15: null zone, still persist

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone,
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '', // filled below
    raw_payload: raw,
  };
  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}
```

**Rejects:** Return `{ reject }` tuple; caller writes to `scrape_rejects`, not `listings` (D-18).

---

### `scraper/src/shared/dedupe.ts` (utility, transform)

**Convention source:** `01-RESEARCH.md` § Pattern 3; D-10

```typescript
import { createHash } from 'node:crypto';
import type { CanonicalListing } from './schema.js';

export function contentHash(listing: Omit<CanonicalListing, 'content_hash'>): string {
  const payload = `${listing.title}|${listing.photo_url}|${listing.lat}|${listing.lng}`;
  return createHash('sha256').update(payload).digest('hex');
}
```

**Persist integration:** Hash compare before upsert; skip if unchanged (see `persist.ts`).

---

### `scraper/src/shared/zone-tag.ts` (utility, transform)

**Convention source:** `01-RESEARCH.md` § Pattern 4; D-14, D-15

```typescript
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { VeniceZone } from './schema.js';
import centroStorico from '../geo/centro-storico.geojson' assert { type: 'json' };
// ... other zone imports

export function tagZone(lat: number, lng: number, zones: ZonePolygon[]): VeniceZone | null {
  const pt = point([lng, lat]); // GeoJSON order: [lng, lat]
  for (const z of zones) {
    if (booleanPointInPolygon(pt, z.polygon)) return z.id;
  }
  return null;
}
```

**Key rules:** Prefer `@turf/boolean-point-in-polygon` scoped import; static GeoJSON in `scraper/src/geo/`; `zone = null` over wrong zone.

---

### `scraper/src/shared/validate-run.ts` (middleware, batch)

**Convention source:** `01-RESEARCH.md` § Pattern 5; D-19, D-20

```typescript
export function validateBatch(
  listings: unknown[],
  trailingMedians: number[],
  selectorHitRate: number,
  minCountRatio = 0.5,
  minSelectorRate = 0.9,
): { ok: true } | { ok: false; reason: string } {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b) / trailingMedians.length
    : 50; // bootstrap before 7 runs
  const minCount = Math.floor(median * minCountRatio);

  if (listings.length < minCount) {
    return { ok: false, reason: `count ${listings.length} < min ${minCount} (50% of median ${median})` };
  }
  if (selectorHitRate < minSelectorRate) {
    return { ok: false, reason: `selector hit rate ${selectorHitRate} < ${minSelectorRate}` };
  }
  return { ok: true };
}
```

**Key rules:** Runs after full extract, before any listing persist; failure still writes `scrape_runs` audit row.

---

### `scraper/src/shared/persist.ts` (service, CRUD)

**Convention source:** `01-RESEARCH.md` § Pattern 3; D-07, D-10

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalListing } from './schema.js';

export async function persistListing(
  supabase: SupabaseClient,
  listing: CanonicalListing,
): Promise<'skipped' | 'inserted' | 'updated'> {
  const { data: existing } = await supabase
    .from('listings')
    .select('content_hash')
    .eq('source', listing.source)
    .eq('external_id', listing.external_id)
    .maybeSingle();

  if (existing?.content_hash === listing.content_hash) return 'skipped';

  const { error } = await supabase.from('listings').upsert(
    {
      ...listing,
      scraped_at: new Date().toISOString(),
      geom: listing.lat && listing.lng
        ? `SRID=4326;POINT(${listing.lng} ${listing.lat})`
        : null,
    },
    { onConflict: 'source,external_id' },
  );
  if (error) throw error;
  return existing ? 'updated' : 'inserted';
}
```

**Key rules:** Direct Supabase write via service role; WKT `POINT(lng lat)` for PostGIS; parameterized client only (no raw SQL concat).

---

### `scraper/src/alert/notify.ts` (service, event-driven)

**Convention source:** D-21

Pick one channel at implementation (Claude's discretion):

```typescript
// Option A: Resend email
import { Resend } from 'resend';
export async function notifyOperator(message: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.ALERT_FROM!,
    to: process.env.ALERT_TO!,
    subject: '[shou-man-wu] Scraper alert',
    text: message,
  });
}

// Option B: Telegram — node-telegram-bot-api
```

**Key rules:** Alert within 5 minutes of soft-block; no PagerDuty; fire on batch validation failure and unhandled worker errors.

---

### `scraper/src/geo/*.geojson` (config, file-I/O)

**Convention source:** D-14; Open Questions #3 in RESEARCH

Static FeatureCollection polygons for `centro_storico`, `mestre_marghera`, `lido_murano`. Export from OSM relation boundaries; simplify for worker bundle size. Loaded once at module init in `zone-tag.ts`.

---

### `docs/legal/subito-scraping-note.md` (config)

**Convention source:** D-22, Pitfall 1

Document: robots.txt prohibition, operational risk, fallback supply plan (manual seeding + UGC acceleration in Phase 3). Required before production traffic.

---

### Test Files (`scraper/src/**/*.test.ts`)

**Convention source:** `01-RESEARCH.md` § Validation Architecture

| Test File | Covers | Pattern |
|-----------|--------|---------|
| `schema.test.ts` | SCRP-02 | Valid fixture passes `.parse()`; missing required field throws |
| `normalize.test.ts` | SCRP-05 | Price keywords reject; clean titles pass; `expires_at = posted_at + 48h` |
| `dedupe.test.ts` | SCRP-02 | Same fields → same hash; changed title → different hash |
| `zone-tag.test.ts` | SCRP-03 | Known point inside/outside each polygon |
| `validate-run.test.ts` | SCRP-06 | Low count fails; low selector rate fails; pass allows persist mock |
| `categories.test.ts` | SCRP-01 | URLs match Veneto regalo pattern; no `?o=` params |

**Vitest config pattern:**

```typescript
// scraper/vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

**package.json scripts:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node --import tsx src/worker.ts"
  },
  "devDependencies": { "vitest": "^3.0.0", "tsx": "^4.0.0" }
}
```

---

### `scraper/Dockerfile` (config)

**Convention source:** D-01; STACK.md scraper worker hosting

```dockerfile
FROM node:22-slim
RUN npx playwright install-deps chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx playwright install chromium
CMD ["node", "--import", "tsx", "src/worker.ts"]
```

Deploy target: Fly.io Machine or Hetzner VPS with cron trigger.

---

## Shared Patterns

### Pipeline Layer Separation (D-05)

**Source:** `01-RESEARCH.md` § Pattern 1
**Apply to:** `crawler.ts`, `extract.ts`, `normalize.ts`, `persist.ts`

```
Crawlee (fetch) → extract.ts (DOM) → normalize.ts (Zod+filter+zone) → validate-run.ts (gate) → persist.ts (DB)
```

Each layer imports only from layers below it in the pipeline, never sideways into Crawlee from normalize/persist.

### Zod Gate Before Side Effects (D-13)

**Source:** `01-RESEARCH.md` § Pattern 2
**Apply to:** `normalize.ts`, `persist.ts`

All objects reaching `persist.ts` must be `CanonicalListingSchema.parse()` output. Rejects go to `scrape_rejects` before Zod, not after.

### Content-Hash Dedup (D-10)

**Source:** `01-RESEARCH.md` § Pattern 3
**Apply to:** `dedupe.ts`, `persist.ts`

Unique constraint `(source, external_id)` in DB; app-level hash skip avoids redundant writes.

### Batch Validation Gate (D-19, D-20)

**Source:** `01-RESEARCH.md` § Pattern 5
**Apply to:** `worker.ts`, `validate-run.ts`

Failed batch → `scrape_runs` failure row + alert; **zero** listing mutations.

### Service Role Isolation (D-07, Pitfall 6)

**Source:** `01-RESEARCH.md` § Security Domain
**Apply to:** `config.ts`, `persist.ts`

Service role key in worker env only; Phase 2 app uses anon key + RLS for reads.

### Data Minimization (V8)

**Source:** `01-RESEARCH.md` § Security Domain
**Apply to:** `extract.ts`, `schema.ts`

Persist only: title, photo, lat/lng, external_url. No seller phone/name/email.

---

## No Analog Found

All 32 files are greenfield. No existing codebase files to copy from.

| Category | Count | Planner Action |
|----------|-------|----------------|
| Migrations | 3 | Use SQL excerpts above verbatim; apply via Supabase CLI or SQL editor |
| Scraper source | 14 | Follow layer separation; spike (D-23) before locking `extract.ts` selectors |
| GeoJSON assets | 3 | Create from OSM boundaries during zone setup task |
| Tests | 6 | Vitest co-located; map to SCRP requirements per Validation Architecture table |
| Config/deploy | 5 | Standard Node ESM + Docker; secrets via env |
| Docs | 1 | Legal note required before prod |

---

## Metadata

**Analog search scope:** `/scraper/`, `/supabase/`, `/app/`, `/lib/`, `/src/` — all empty or absent
**Files scanned:** 1347 workspace files (planning + GSD tooling only; zero application source)
**Pattern extraction date:** 2026-07-26
**Primary references:** `01-RESEARCH.md`, `01-CONTEXT.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`
