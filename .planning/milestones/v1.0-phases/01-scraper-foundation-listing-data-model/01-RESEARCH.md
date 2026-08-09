# Phase 1: Scraper Foundation & Listing Data Model - Research

**Researched:** 2026-07-26
**Domain:** Subito.it web scraping + canonical listing ingestion (Postgres/PostGIS)
**Confidence:** MEDIUM-HIGH

## Summary

Phase 1 delivers a **separate `scraper/` deployable** that runs Crawlee 3.x + Playwright on a small always-on worker, ingests Subito.it free/regalo listings for Veneto, normalizes them through a Zod canonical schema, tags Venice zones via Turf point-in-polygon, and writes directly to Supabase Postgres/PostGIS using the service-role key. The locked CONTEXT decisions are sound and match industry patterns for solo-builder scraper pipelines: isolate fetch infrastructure from extraction, validate output shape (not HTTP status alone), and fail loudly on soft blocks rather than persisting garbage.

Subito.it's `robots.txt` explicitly forbids automated access [VERIFIED: subito.it/robots.txt fetched 2026-07-26] — this is a documented product risk (D-22), not a surprise. The URL pattern for free listings is `/annunci-veneto/regalo/{category}/` with category slugs like `arredamento-casalinghi`, `elettrodomestici`, `bambini-giocattoli` [CITED: subito.it category pages via web search]. Pagination via `?o=` is disallowed in robots.txt, so the scraper must crawl category pages without pagination query params or use in-page "load more" navigation discovered during the mandatory spike (D-23).

**Primary recommendation:** Stand up `scraper/` as an isolated Node/TS package with Crawlee `PlaywrightCrawler` + proxy/session pool, a three-layer pipeline (`fetch/` → `extract/` → `normalize/` → `persist/`), Supabase migrations for `listings` + audit tables, and a batch-level validation gate that aborts persistence when count/selector checks fail — all before building any map UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Scraper Runtime & Deployment
- **D-01:** Run the Subito scraper as a **separate deployable** on a small always-on worker (Fly.io Machine or ~$5–6/mo Hetzner/DigitalOcean droplet), not inside Vercel serverless functions — **Reversibility:** costly.
- **D-02:** Schedule scraper runs on a **1–2 hour cron** (default: every 90 minutes) via the worker's cron or a lightweight scheduler — **Reversibility:** reversible.
- **D-03:** Use **Crawlee 3.x + Playwright** as the scraper framework with built-in fingerprint injection, retry/backoff, and session pool — **Reversibility:** costly.

#### Proxy & Anti-Bot Posture
- **D-04:** Use **pay-as-you-go residential proxy rotation** (e.g., DataImpulse/Webshare tier) within the $20–100/mo budget; no enterprise proxy minimums — **Reversibility:** reversible.
- **D-05:** Separate **fetch/infrastructure** (Crawlee crawler, proxy, retries) from **extraction** (DOM parsing) so selector fixes are isolated — **Reversibility:** reversible.

#### Data Store & Ingestion Path
- **D-06:** Use **Supabase Pro (Postgres + PostGIS)** as the listing store — **Reversibility:** one-way.
- **D-07:** Scraper worker writes **directly to Supabase** via service-role connection (not through Next.js API routes) after Zod validation — **Reversibility:** costly.
- **D-08:** Enable **PostGIS** extension; store geometry as `geography(Point, 4326)` plus a denormalized `zone` enum column for fast filtering — **Reversibility:** one-way.

#### Canonical Listing Schema
- **D-09:** Single **`listings` table** with `source` enum (`subito` | `facebook` | `ugc`); Phase 1 only inserts `source = 'subito'` — **Reversibility:** one-way.
- **D-10:** Dedup key: **`(source, external_id)`** unique constraint; skip re-insert on unchanged hash, upsert on changed fields — **Reversibility:** costly.
- **D-11:** Core scraped fields: `id`, `source`, `external_id`, `title`, `photo_url`, `external_url`, `lat`, `lng`, `geom`, `zone`, `status`, `posted_at`, `scraped_at`, `expires_at`, `content_hash`, `raw_payload` (jsonb, optional debug) — **Reversibility:** costly.
- **D-12:** Set `status = 'active'` on insert; `expires_at = posted_at + 48h` computed at ingestion (expiry enforcement deferred to Phase 2 queries/cron) — **Reversibility:** reversible.
- **D-13:** Validate all scraper output through a **Zod canonical schema** before any DB write — **Reversibility:** reversible.

#### Zone Tagging
- **D-14:** Maintain **three precomputed Venice zone polygons** as static GeoJSON (`centro_storico`, `mestre_marghera`, `lido_murano`); tag via point-in-polygon at ingestion using Turf — **Reversibility:** costly.
- **D-15:** Listings with missing/ungeocodable coordinates get `zone = null` and are **excluded from zone-filtered queries** but retained for operator review — **Reversibility:** reversible.
- **D-16:** Geocoding source for Subito listings: **parse lat/lng from listing page/map embed first**; fallback to municipality text → approximate centroid only when coords absent — **Reversibility:** reversible.

#### Free-Listing Filter (SCRP-05)
- **D-17:** Filter at normalization using **Italian price/negotiation keyword rules**: reject titles/descriptions matching patterns for `€`, `euro`, `prezzo`, `trattativa`, `pagamento`, `vend`, numeric price patterns, and "non gratis"/"a pagamento" — **Reversibility:** reversible.
- **D-18:** Rejected listings are **logged to a `scrape_rejects` table** (reason, raw snippet) for operator tuning, not silently dropped — **Reversibility:** reversible.

#### Soft-Block Detection & Alerting (SCRP-06)
- **D-19:** After each run, assert: (a) HTTP fetch succeeded, (b) **minimum listing count ≥ 50% of trailing 7-run median**, (c) required selectors resolve on ≥ 90% of parsed items — **Reversibility:** reversible.
- **D-20:** On validation failure, **do not persist the batch**; write a `scrape_runs` audit row with failure reason and alert operator — **Reversibility:** reversible.
- **D-21:** Operator alerts via **email (Resend/similar) or Telegram bot** — simplest channel for solo builder; no PagerDuty — **Reversibility:** reversible.

#### Legal & Operational Posture
- **D-22:** Proceed with Subito scraping as the **documented MVP bet**, with explicit acknowledgment that Subito `robots.txt` forbids automated access — maintain a **legal/ops note** in repo and a **fallback supply plan** (manual seeding + accelerated UGC in Phase 3) if scraper is blocked — **Reversibility:** one-way.
- **D-23:** Run a **short spike** (≤ 1 plan task) against live Subito category pages before locking selectors — validate current DOM structure and anti-bot posture — **Reversibility:** reversible.

### Claude's Discretion
- Exact proxy provider choice within pay-as-you-go budget
- Worker host choice (Fly.io vs Hetzner) within cost target
- Specific Zod schema field nullability for optional Subito fields (description, multiple photos)
- Alert channel implementation details (Telegram vs email) as long as operator is notified within 5 minutes of soft-block

### Deferred Ideas (OUT OF SCOPE)
- FB Marketplace scraper (SCRP-07) — v2 / Phase stretch
- Map UI, WebView shell, favorites — Phase 2
- 48h expiry enforcement in UI/cron — Phase 2 (schema field set in Phase 1)
- UGC posting, DM, moderation UI — Phase 3
- Auth, push alerts — Phase 4
- i18n — Phase 5
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRP-01 | System ingests free listings from Subito.it (Veneto/Venice free-item category) on a 1–2 hour refresh cadence | Crawlee `PlaywrightCrawler` on dedicated worker + 90min cron; target URLs `/annunci-veneto/regalo/{category}/`; proxy rotation via `ProxyConfiguration` [CITED: crawlee.dev/js/docs/guides/proxy-management] |
| SCRP-02 | System normalizes scraped listings into a canonical schema with source badge (`subito`, `facebook`, `ugc`) | Zod canonical schema + `listings` table with `source` enum; dedup on `(source, external_id)` + `content_hash` skip/upsert [CITED: supabase upsert onConflict docs] |
| SCRP-03 | System assigns zone tags to listings at ingestion via point-in-polygon (not live radius queries) | Static GeoJSON polygons + `@turf/boolean-point-in-polygon` at normalization time; store denormalized `zone` column + PostGIS `geom` [CITED: turfjs booleanPointInPolygon] |
| SCRP-05 | System filters out mislabeled "free" listings (price/negotiation language) at ingestion | Italian keyword regex filter in `normalize.ts`; rejects → `scrape_rejects` table (D-17, D-18) |
| SCRP-06 | System validates scraper output shape and alerts on soft-block / empty-feed failures | Batch gate: count ≥ 50% trailing median, selector completeness ≥ 90%; failed batch → `scrape_runs` + operator alert, no DB writes (D-19, D-20) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Subito page fetch + anti-bot evasion | Dedicated scraper worker | Residential proxy SaaS | Long-running Playwright sessions, session/proxy state — cannot run on Vercel serverless (D-01) |
| DOM extraction / selector parsing | Scraper worker (`extract/`) | — | Pure parsing logic isolated from fetch infra (D-05); selector fixes don't touch proxy/crawler config |
| Canonical normalization + Zod validation | Scraper worker (`normalize/`) | — | All ingestion validation happens before any DB write (D-13); keeps bad data out of Postgres |
| Free-listing keyword filter | Scraper worker (`normalize/`) | — | Content verification at ingestion, not query-time (SCRP-05) |
| Zone point-in-polygon tagging | Scraper worker (`normalize/`) | Static GeoJSON assets in repo | Zone computed once at ingestion, stored as column — not recomputed on every map query (D-14, SCRP-03) |
| Listing persistence + dedup | Database (Supabase Postgres) | Scraper worker (orchestrates upsert) | Postgres owns uniqueness via `(source, external_id)` constraint; worker uses service-role client (D-07) |
| PostGIS geometry storage | Database | Scraper worker (writes `geom` from lat/lng) | `geography(Point, 4326)` + GiST index lives in DB; worker populates from parsed coords (D-08) |
| Soft-block detection + run audit | Scraper worker (`validate/`) | Database (`scrape_runs` table) | Validation runs post-extract, pre-persist; audit rows persisted even on failure (D-19, D-20) |
| Operator alerting | Scraper worker | External (Resend/Telegram) | Alert fires from worker after failed validation; no UI in Phase 1 (D-21) |
| Cron scheduling | Worker host (system cron or node-cron) | — | 90-minute cadence on always-on VM/container (D-02) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `crawlee` | 3.17.0 | Scraping framework (PlaywrightCrawler, proxy, session pool, retry) | Built-in fingerprint injection, session management, proxy rotation — avoids hand-rolling anti-bot infra [VERIFIED: npm registry + CITED: crawlee.dev/js/docs/guides/proxy-management] |
| `playwright` | 1.62.0 | Headless browser (via Crawlee) | JS-rendered Subito pages require full browser; let Crawlee resolve compatible Playwright version [VERIFIED: npm registry] |
| `@supabase/supabase-js` | 2.110.8 | Direct DB writes from worker via service-role key | Official Supabase client; `upsert({ onConflict })` for dedup writes [VERIFIED: npm registry + CITED: supabase/supabase docs] |
| `zod` | 4.4.3 | Runtime validation of canonical listing schema before DB insert | Type-safe schema shared between scraper and future app; catches silent field drift [VERIFIED: npm registry] |
| `@turf/boolean-point-in-polygon` | 7.3.5 | Point-in-polygon zone tagging at ingestion | Lightweight single-function import vs full `@turf/turf` bundle; GeoJSON `[lng, lat]` order [VERIFIED: npm registry + CITED: turfjs/turf] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node-cron` | latest (6.x) | In-process cron scheduler | When worker host lacks system cron (Fly.io Machines); alternative: OS `crontab` on VPS [ASSUMED] |
| `resend` | 6.18.0 | Email alerts on soft-block | If operator prefers email over Telegram (Claude's discretion, D-21) [VERIFIED: npm registry] |
| `node-telegram-bot-api` | latest | Telegram bot alerts on soft-block | Simpler/faster for solo builder than email DNS setup (Claude's discretion, D-21) [ASSUMED] |
| `dotenv` | latest | Load `SUPABASE_SERVICE_ROLE_KEY`, proxy creds | Worker env config — never commit secrets [ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Crawlee + Playwright | Raw Playwright | Loses fingerprint injection, session pool, proxy integration — weeks of hand-rolled infra |
| Direct Supabase write | Next.js ingest API route | Adds auth/rate-limit layer not needed at this scale; violates D-07 |
| `@turf/boolean-point-in-polygon` | PostGIS `ST_Contains` at ingestion | PostGIS zone check requires DB round-trip per listing; Turf in-worker is faster for batch ingest |
| Turf at ingestion | PostGIS at query-time | Violates D-14 locked decision; query-time polygon checks add latency to every map request |
| node-cron | Supabase `pg_cron` + pgmq | pgmq adds complexity before needed; direct cron on worker is simpler for Phase 1 solo builder |

**Installation:**
```bash
mkdir scraper && cd scraper
npm init -y
npm install crawlee zod @supabase/supabase-js @turf/boolean-point-in-polygon dotenv
npx playwright install chromium
# Optional alerting (pick one):
npm install resend          # email
# OR
npm install node-telegram-bot-api  # Telegram
# Optional scheduling:
npm install node-cron
```

**Version verification:** All core package versions confirmed via `npm view <pkg> version` on 2026-07-26.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `crawlee` | npm | ~2 yrs | 128K/wk | github.com/apify/crawlee | OK | Approved |
| `playwright` | npm | current | 72M/wk | github.com/microsoft/playwright | SUS | Flagged — `too-new` publish date on latest; pin via Crawlee's resolved range |
| `@supabase/supabase-js` | npm | current | 22M/wk | github.com/supabase/supabase-js | SUS | Flagged — `too-new` publish date; official Supabase client, proceed |
| `zod` | npm | ~5 yrs | 240M/wk | github.com/colinhacks/zod | OK | Approved |
| `@turf/boolean-point-in-polygon` | npm | ~8 yrs | 3.2M/wk | github.com/Turfjs/turf | OK | Approved |
| `@turf/turf` | npm | ~8 yrs | 1.3M/wk | github.com/Turfjs/turf | OK | Approved (prefer scoped package above) |
| `resend` | npm | ~2 yrs | 8.6M/wk | github.com/resend/resend-node | SUS | Flagged — `too-new`; official Resend SDK |
| `node-cron` | npm | ~10 yrs | 6.3M/wk | github.com/node-cron/node-cron | SUS | Flagged — `too-new`; widely used scheduler |
| `node-telegram-bot-api` | npm | ~9 yrs | 217K/wk | github.com/yagop/node-telegram-bot-api | SUS | Flagged — `too-new`; community Telegram SDK |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `playwright`, `@supabase/supabase-js`, `resend`, `node-cron`, `node-telegram-bot-api` — all flagged only for `too-new` publish date on latest semver (registry artifact of frequent releases), not missing repos. Planner should add `checkpoint:human-verify` before first install of alerting library choice.

**Postinstall script audit:** No suspicious postinstall scripts found on any recommended package.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEDICATED SCRAPER WORKER (Phase 1)                   │
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ OS cron  │───▶│ Crawlee      │───▶│ Extract     │───▶│ Normalize │ │
│  │ (90 min) │    │ Playwright   │    │ (DOM parse) │    │ + Zod     │ │
│  └──────────┘    │ + ProxyPool  │    └─────────────┘    │ + Filter  │ │
│                  │ + Sessions   │                         │ + ZoneTag │ │
│                  └──────┬───────┘                         └─────┬─────┘ │
│                         │                                       │       │
│                         │         ┌─────────────┐               │       │
│                         │         │ Batch Gate  │◀──────────────┘       │
│                         │         │ count/check │                       │
│                         │         │ selectors   │                       │
│                         │         └──────┬──────┘                       │
│                         │                │                              │
│                    PASS │                │ FAIL                         │
│                         ▼                ▼                              │
│                  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│                  │ Persist     │   │ scrape_runs │   │ Alert        │  │
│                  │ upsert/skip │   │ (failure)   │   │ Resend/TG    │  │
│                  └──────┬──────┘   └─────────────┘   └──────────────┘  │
└─────────────────────────┼───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRES + PostGIS                           │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────────┐  │
│  │ listings     │  │ scrape_runs   │  │ scrape_rejects               │  │
│  │ (canonical)  │  │ (audit log)   │  │ (filtered-out listings)      │  │
│  └──────────────┘  └───────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Phase 2 reads same table)
                    [Next.js Map UI]
```

### Recommended Project Structure

```
shou-man-wu/
├── supabase/
│   └── migrations/
│       ├── 001_enable_postgis.sql
│       ├── 002_listings_schema.sql
│       └── 003_scrape_audit_tables.sql
├── scraper/                          # SEPARATE deployable
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── worker.ts                 # cron entrypoint
│   │   ├── config.ts                 # env, category URLs, thresholds
│   │   ├── subito/
│   │   │   ├── crawler.ts            # Crawlee PlaywrightCrawler setup
│   │   │   ├── extract.ts            # DOM selectors → raw listing
│   │   │   └── categories.ts         # Veneto regalo category seed URLs
│   │   ├── shared/
│   │   │   ├── schema.ts             # Zod canonical listing schema
│   │   │   ├── normalize.ts          # raw → canonical + free filter
│   │   │   ├── dedupe.ts             # content_hash compute + skip logic
│   │   │   ├── zone-tag.ts           # Turf point-in-polygon
│   │   │   ├── validate-run.ts       # soft-block batch gate
│   │   │   └── persist.ts            # Supabase upsert/skip
│   │   ├── geo/
│   │   │   ├── centro-storico.geojson
│   │   │   ├── mestre-marghera.geojson
│   │   │   └── lido-murano.geojson
│   │   └── alert/
│   │       └── notify.ts             # Resend or Telegram
│   └── Dockerfile                    # for Fly.io / VPS deploy
├── docs/
│   └── legal/
│       └── subito-scraping-note.md   # D-22 legal/ops acknowledgment
└── package.json                      # root workspace (optional)
```

### Pattern 1: Fetch/Extract Separation (D-05)

**What:** Crawlee crawler handles navigation, proxy rotation, retries, and session lifecycle; extraction module receives rendered HTML/page and returns typed raw listings with zero knowledge of proxies or browser config.
**When to use:** Always — selector drift is the #1 ongoing maintenance cost; isolation keeps fixes to one file.
**Example:**
```typescript
// Source: crawlee.dev/js/docs/guides/proxy-management
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { extractListingsFromPage } from './extract.js';

const proxyConfiguration = new ProxyConfiguration({
  proxyUrls: [process.env.PROXY_URL!],
});

const crawler = new PlaywrightCrawler({
  proxyConfiguration,
  useSessionPool: true,
  persistCookiesPerSession: true,
  sessionPoolOptions: { maxPoolSize: 20 },
  async requestHandler({ page, request, session }) {
    const title = await page.title();
    if (title.toLowerCase().includes('blocked')) {
      session?.retire();
      return;
    }
    const rawListings = await extractListingsFromPage(page);
    await processRawListings(rawListings);
  },
});
```

### Pattern 2: Zod-Gated Canonical Schema (D-13)

**What:** Every raw listing passes through Zod parse before normalization side-effects (DB writes, reject logging).
**When to use:** Every ingestion path — scraped and future UGC.
**Example:**
```typescript
// Source: zod documentation pattern [ASSUMED structure, field names from D-11]
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
```

### Pattern 3: Content-Hash Skip + Upsert (D-10)

**What:** Compute SHA-256 hash of normalized fields; on conflict `(source, external_id)`, skip write if hash unchanged, upsert if changed.
**When to use:** Every scrape run to avoid redundant writes and unnecessary `scraped_at` churn.
**Example:**
```typescript
// Source: supabase/supabase upsert onConflict docs + app-level hash gate
import { createHash } from 'node:crypto';

function contentHash(listing: CanonicalListing): string {
  const payload = `${listing.title}|${listing.photo_url}|${listing.lat}|${listing.lng}`;
  return createHash('sha256').update(payload).digest('hex');
}

async function persistListing(supabase: SupabaseClient, listing: CanonicalListing) {
  const { data: existing } = await supabase
    .from('listings')
    .select('content_hash')
    .eq('source', listing.source)
    .eq('external_id', listing.external_id)
    .maybeSingle();

  if (existing?.content_hash === listing.content_hash) return 'skipped';

  const { error } = await supabase.from('listings').upsert(
    { ...listing, geom: listing.lat && listing.lng
        ? `SRID=4326;POINT(${listing.lng} ${listing.lat})` : null },
    { onConflict: 'source,external_id' }
  );
  if (error) throw error;
  return existing ? 'updated' : 'inserted';
}
```

### Pattern 4: Zone Tagging at Ingestion (D-14, SCRP-03)

**What:** Load three static GeoJSON polygons; for each listing with valid lat/lng, run Turf `booleanPointInPolygon`; store result in `zone` column.
**When to use:** At normalization time, before persist.
**Example:**
```typescript
// Source: github.com/turfjs/turf booleanPointInPolygon README
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

function tagZone(lat: number, lng: number, zones: ZonePolygon[]): VeniceZone | null {
  const pt = point([lng, lat]); // GeoJSON order: [lng, lat]
  for (const z of zones) {
    if (booleanPointInPolygon(pt, z.polygon)) return z.id;
  }
  return null;
}
```

### Pattern 5: Batch Validation Gate (D-19, SCRP-06)

**What:** After full extraction pass, validate batch before any DB writes. Failed batches write audit row + alert, zero listing mutations.
**When to use:** End of every scrape run.
**Example:**
```typescript
function validateBatch(
  listings: RawListing[],
  trailingMedians: number[],
  selectorHitRate: number,
): { ok: true } | { ok: false; reason: string } {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b) / trailingMedians.length
    : 50; // bootstrap threshold before 7 runs exist
  const minCount = Math.floor(median * 0.5);

  if (listings.length < minCount) {
    return { ok: false, reason: `count ${listings.length} < min ${minCount} (50% of median ${median})` };
  }
  if (selectorHitRate < 0.9) {
    return { ok: false, reason: `selector hit rate ${selectorHitRate} < 0.9` };
  }
  return { ok: true };
}
```

### Anti-Patterns to Avoid

- **Monolithic scraper script:** Single file mixing proxy config, crawling, parsing, and DB writes — every selector fix requires full pipeline retest.
- **HTTP-status-only success checks:** Soft blocks return 200 with empty/truncated content — validate listing count and field completeness instead.
- **Category-tag-only free filtering:** Subito regalo category includes negotiable-price listings — must parse title/description text (D-17).
- **Pagination via `?o=` query params:** Explicitly disallowed in Subito robots.txt — use in-page navigation or category breadth instead.
- **Storing seller PII beyond deep-link needs:** GDPR risk — persist only title, photo, rough location, external_url (PITFALLS.md Pitfall 1 integration table).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser fingerprint spoofing | Custom navigator/canvas overrides | Crawlee default fingerprint injection (`browserPoolOptions.useFingerprints: true`) | Crawlee wraps `fingerprint-suite`; zero-config in PlaywrightCrawler [CITED: crawlee.dev/js/docs/3.16/guides/avoid-blocking] |
| Proxy rotation + session cookies | Custom proxy pool manager | Crawlee `ProxyConfiguration` + `useSessionPool` + `persistCookiesPerSession` | Session retirement (`session.retire()`) on block detection is built-in |
| Retry/backoff on failed requests | Custom retry loop | Crawlee `maxRequestRetries` + `retryOnBlocked` | Handles exponential backoff, session rotation on block |
| Runtime schema validation | Manual if/else field checks | Zod `CanonicalListingSchema.parse()` | Type inference + clear error messages on drift |
| Point-in-polygon math | Ray-casting implementation | `@turf/boolean-point-in-polygon` | Handles holes, multipolygons, edge cases |
| PostGIS setup | Custom lat/lng indexing | Supabase PostGIS extension + `geography(POINT)` + GiST index | Native spatial queries for Phase 2 map bbox [CITED: supabase.com/docs/guides/database/extensions/postgis] |
| Job scheduling infrastructure | Redis/BullMQ/SQS | OS cron or `node-cron` on worker | Solo builder, 90min cadence, single city — Postgres queue is premature |

**Key insight:** The scraper's value is in extraction quality and data trust, not infrastructure novelty. Crawlee + Supabase eliminate 80% of the boilerplate that kills solo-builder scraper projects.

## Common Pitfalls

### Pitfall 1: Subito robots.txt Explicit Prohibition

**What goes wrong:** Building the entire product on a data source whose owner explicitly forbids automated access; eventual C&D or IP ban.
**Why it happens:** Technical POC success conflated with legal/operational permission.
**How to avoid:** Document in `docs/legal/subito-scraping-note.md` (D-22); maintain fallback supply plan; treat scraper uptime as product risk.
**Warning signs:** Rising 403/429 rates, CAPTCHA pages, direct contact from Subito.
**Source:** [VERIFIED: subito.it/robots.txt fetched 2026-07-26]

### Pitfall 2: Soft Blocks Silently Corrupting Feed

**What goes wrong:** HTTP 200 with empty/stale content written to DB; map shows stale listings for hours.
**Why it happens:** Monitoring HTTP status alone.
**How to avoid:** Batch validation gate (D-19); do not persist failed batches (D-20); alert operator (D-21).
**Warning signs:** Listing count drops sharply; logs show "success" but no new rows.

### Pitfall 3: Selector Drift Breaking Extraction

**What goes wrong:** Subito DOM changes break CSS selectors; titles/photos/coords silently missing.
**Why it happens:** Brittle class-name selectors; infrastructure tangled with extraction.
**How to avoid:** Fetch/extract separation (D-05); structural selectors with fallback chain; spike before locking selectors (D-23).
**Warning signs:** Field completeness drops below 90% threshold.

### Pitfall 4: Mislabeled "Free" Listings in Feed

**What goes wrong:** Negotiable-price listings ("trattativa privata") appear as free; users lose trust immediately.
**Why it happens:** Category-based scraping without content validation.
**How to avoid:** Italian keyword filter at normalization (D-17); log rejects to `scrape_rejects` (D-18).
**Warning signs:** User reports of "not actually free" clustering.

### Pitfall 5: Venice Zone Misclassification Near Borders

**What goes wrong:** Listings near Mestre/Centro bridge tagged to wrong zone due to GPS drift or coarse centroids.
**Why it happens:** Fallback geocoding to municipality centroid when coords missing (D-16).
**How to avoid:** Prefer lat/lng from listing page map embed; only centroid-fallback when coords truly absent; accept `zone = null` over wrong zone (D-15).
**Warning signs:** Zone-filtered results missing visibly nearby items.

### Pitfall 6: Service Role Key Exposure

**What goes wrong:** Service role key committed to git or exposed in client bundle; full DB bypass.
**Why it happens:** Copy-paste env setup without `.gitignore` discipline.
**How to avoid:** Worker-only env vars; never import scraper code in Next.js app; use Supabase RLS for Phase 2 read paths.
**Warning signs:** Key appears in Vercel env or client-side bundle analysis.

## Code Examples

### PostGIS Migration (Supabase)

```sql
-- Source: supabase.com/docs/guides/database/extensions/postgis
-- Migration 001: enable PostGIS
create extension if not exists postgis with schema extensions;

-- Migration 002: listings table
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

### Scrape Audit Tables

```sql
-- Migration 003: audit tables
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

### Italian Free-Listing Filter

```typescript
// Source: D-17 keyword rules from CONTEXT.md
const PRICE_PATTERNS = [
  /€\s*\d+/i,
  /\d+\s*€/i,
  /\beuro\b/i,
  /\bprezzo\b/i,
  /\btrattativa\b/i,
  /\bpagamento\b/i,
  /\bvend/i,
  /\ba pagamento\b/i,
  /\bnon gratis\b/i,
  /\d{2,}\s*(?:euro|€)/i,
];

export function isMislabeledFree(title: string, description?: string): string | null {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(text)) return `matched price pattern: ${pattern.source}`;
  }
  return null;
}
```

### Supabase Service-Role Client (Worker Only)

```typescript
// Source: supabase.com/docs — service role / secret key for backend workers
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose to frontend
  { auth: { persistSession: false, autoRefreshToken: false } }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw Playwright scripts | Crawlee 3.x wrapping Playwright | Crawlee 3 stable ~2023+ | Fingerprint/session/proxy bundled; default for JS scraping in 2026 |
| Scraper in serverless cron route | Dedicated always-on worker | Vercel 300s timeout limit | Required for headless browser sessions >5min |
| PostGIS `geometry` type | `geography(Point, 4326)` for lat/lng apps | PostGIS best practice | Correct geodesic distance on WGS84 coords |
| `@turf/turf` full bundle | Scoped `@turf/boolean-point-in-polygon` | Turf v7 modular packages | Smaller worker bundle for single-function use |
| Supabase `service_role` key naming | New `sb_secret_...` key format | 2025-2026 API key migration | Same bypass-RLS semantics; update env var naming at implementation |

**Deprecated/outdated:**
- Running scraper inside Vercel serverless — explicitly rejected in STACK.md and D-01
- Category-only "free" filtering without text validation — rejected in D-17

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Subito regalo category URLs follow `/annunci-veneto/regalo/{slug}/` pattern | Standard Stack | Scraper targets wrong pages; spike (D-23) resolves |
| A2 | Subito listing detail pages embed lat/lng in map widget or JSON-LD | Zone Tagging / D-16 | More listings fall back to centroid → `zone = null` |
| A3 | Crawlee 3.x enables fingerprint injection by default in JS PlaywrightCrawler | Don't Hand-Roll | May need explicit `browserPoolOptions.useFingerprints: true` |
| A4 | Fly.io Machines or Hetzner $5-6/mo droplet sufficient for 90min Playwright runs | Environment | OOM or timeout if category breadth too wide — tune concurrency |
| A5 | Pay-as-you-go residential proxy ($10-30/mo) sufficient for single-city Subito cadence | Standard Stack | IP bans if under-provisioned; increase proxy budget |
| A6 | Venice zone GeoJSON polygons can be hand-drawn from OpenStreetMap boundaries | Zone Tagging | Incorrect zone boundaries → wrong filter results; needs manual QA |
| A7 | `node-cron` or OS cron adequate without pgmq for Phase 1 | Architecture | Acceptable at Phase 1 scale; revisit if multi-source scraping added |

## Open Questions (RESOLVED)

1. **Exact Subito DOM selectors for listing cards and detail pages** — RESOLVED by Plan 02 spike task (D-23); selectors documented in `scraper/subito/extract.ts` and `SPIKE-NOTES.md` after live verification.

2. **Pagination strategy without `?o=` query params** — RESOLVED by Plan 02 spike; fallback is multiple category slugs without deep pagination (robots.txt forbids `?o=` URLs).

3. **Venice zone polygon source of truth** — RESOLVED in Plan 03: export simplified boundaries from OpenStreetMap relations into `scraper/src/geo/venice-zones.geojson`.

4. **Proxy provider selection** — RESOLVED as Claude discretion in Plan 04 (D-04): start with Webshare or DataImpulse trial; measure block rate during production crawl task.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Scraper worker runtime | ✓ | v23.10.0 | — |
| npm | Package management | ✓ | 11.4.2 | — |
| Chromium (Playwright) | Headless browser | ✗ (not installed) | — | `npx playwright install chromium` in Wave 0 |
| Supabase project | Postgres + PostGIS store | ✗ | — | Create Supabase Pro project; enable PostGIS extension |
| Supabase service role key | Worker DB writes | ✗ | — | Generate in Supabase dashboard; store in worker env only |
| Residential proxy | Anti-bot IP rotation | ✗ | — | Sign up pay-as-you-go provider (D-04); required before production traffic |
| Docker | Optional containerized deploy | ✗ | — | Deploy via direct Node on VPS instead |
| Fly.io CLI | Optional worker host | ✗ | — | Use Hetzner/DigitalOcean VPS with systemd + cron |
| psql CLI | Optional local migration testing | ✗ | — | Use Supabase SQL Editor or `supabase db push` |
| Resend API key / Telegram bot token | Operator alerts | ✗ | — | Pick one alerting channel (D-21 discretion) |

**Missing dependencies with no fallback:**
- Supabase Pro project (blocks all persistence)
- Residential proxy (blocks sustained production scraping)

**Missing dependencies with fallback:**
- Fly.io CLI → Hetzner/DigitalOcean VPS with OS cron
- Docker → direct Node.js process on VPS
- psql → Supabase dashboard SQL editor

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x [ASSUMED — standard for Node/TS packages] |
| Config file | `scraper/vitest.config.ts` (Wave 0) |
| Quick run command | `cd scraper && npx vitest run --reporter=dot` |
| Full suite command | `cd scraper && npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRP-01 | Category URL config includes Veneto regalo paths | unit | `cd scraper && npx vitest run src/subito/categories.test.ts` | ❌ Wave 0 |
| SCRP-02 | Zod schema accepts valid listing, rejects invalid | unit | `cd scraper && npx vitest run src/shared/schema.test.ts` | ❌ Wave 0 |
| SCRP-02 | Dedup skips unchanged hash, upserts changed | unit | `cd scraper && npx vitest run src/shared/dedupe.test.ts` | ❌ Wave 0 |
| SCRP-03 | Point-in-polygon assigns correct Venice zone | unit | `cd scraper && npx vitest run src/shared/zone-tag.test.ts` | ❌ Wave 0 |
| SCRP-05 | Italian price keywords rejected; clean titles pass | unit | `cd scraper && npx vitest run src/shared/normalize.test.ts` | ❌ Wave 0 |
| SCRP-06 | Batch gate rejects low count / low selector rate | unit | `cd scraper && npx vitest run src/shared/validate-run.test.ts` | ❌ Wave 0 |
| SCRP-06 | Failed batch does not call persist | unit | `cd scraper && npx vitest run src/shared/validate-run.test.ts` | ❌ Wave 0 |
| SCRP-01 | End-to-end scrape against Subito (live) | integration/manual | Spike task only — not in CI | ❌ Wave 0 (spike) |

### Sampling Rate

- **Per task commit:** `cd scraper && npx vitest run --reporter=dot`
- **Per wave merge:** `cd scraper && npx vitest run --coverage`
- **Phase gate:** Full unit suite green + live spike documented before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `scraper/package.json` with vitest devDependency and test script
- [ ] `scraper/vitest.config.ts` — TypeScript test runner config
- [ ] `scraper/src/shared/schema.test.ts` — covers SCRP-02
- [ ] `scraper/src/shared/normalize.test.ts` — covers SCRP-05
- [ ] `scraper/src/shared/zone-tag.test.ts` — covers SCRP-03
- [ ] `scraper/src/shared/validate-run.test.ts` — covers SCRP-06
- [ ] `scraper/src/shared/dedupe.test.ts` — covers SCRP-02 dedup
- [ ] `supabase/migrations/` — PostGIS + listings + audit tables
- [ ] Framework install: `cd scraper && npm install -D vitest`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No user auth in Phase 1 |
| V3 Session Management | no | No user sessions in Phase 1 |
| V4 Access Control | yes | Service role key worker-only; RLS on `listings` for Phase 2 anon reads |
| V5 Input Validation | yes | Zod canonical schema before every DB write (D-13) |
| V6 Cryptography | no | No custom crypto; HTTPS for all external calls |
| V8 Data Protection | yes | Do not persist seller PII beyond map pin + deep link needs |
| V14 Configuration | yes | Secrets in env vars only; `.env` in `.gitignore` |

### Known Threat Patterns for Scraper + Supabase Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service role key leak | Elevation of Privilege | Worker-only env; never in git/client bundle [CITED: supabase.com/docs/guides/database/secure-data] |
| Scraped payload injection via malformed HTML | Tampering | Zod validation rejects unexpected shapes before DB write |
| SQL injection via scraper fields | Tampering | Supabase client parameterized queries; no raw SQL string concat |
| Persisting seller phone/name from scraped pages | Information Disclosure | Store only title, photo, lat/lng, external_url — no seller contact fields |
| Proxy credential exposure | Information Disclosure | Proxy URL with embedded creds in env var only |
| Mislabeled free listings eroding trust | Repudiation | `scrape_rejects` audit trail + keyword filter (SCRP-05) |

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` or `.claude/.cursor/rules/` directory exists in the project workspace. No project-specific coding conventions beyond GSD planning artifacts and CONTEXT.md locked decisions.

## Sources

### Primary (HIGH confidence)
- `subito.it/robots.txt` — fetched directly 2026-07-26; explicit anti-scraping prohibition
- npm registry — package version verification for crawlee, playwright, zod, @supabase/supabase-js, @turf/*

### Secondary (MEDIUM confidence)
- Context7 `/websites/crawlee_dev_js` — PlaywrightCrawler proxy/session management patterns
- Context7 `/supabase/supabase` — PostGIS extension setup, upsert onConflict, service role client
- Context7 `/turfjs/turf` — booleanPointInPolygon API and coordinate order
- CRAWLEE avoid-blocking guide — default fingerprint injection in PlaywrightCrawler [CITED: crawlee.dev/js/docs/3.16/guides/avoid-blocking]
- `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md` — project-level research synthesis
- `.planning/phases/01-scraper-foundation-listing-data-model/01-CONTEXT.md` — locked decisions

### Tertiary (LOW confidence)
- Web search — Subito regalo category URL patterns (needs spike validation per D-23)
- Web search — soft-block detection best practices (aligned with PITFALLS.md, not independently verified against Subito)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions verified; Crawlee/Supabase/Turf patterns from official docs
- Architecture: MEDIUM-HIGH — greenfield but well-established scraper→Postgres pipeline pattern; Subito-specific DOM unverified until spike
- Pitfalls: HIGH for robots.txt/legal and soft-block patterns; MEDIUM for Venice GPS/zone edge cases

**Research date:** 2026-07-26
**Valid until:** 2026-08-26 (30 days — stable stack; Subito DOM may change sooner, triggering spike refresh)
