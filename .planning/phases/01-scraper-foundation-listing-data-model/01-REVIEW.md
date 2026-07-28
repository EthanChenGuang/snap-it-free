---
phase: 01-scraper-foundation-listing-data-model
reviewed: 2026-07-28T07:30:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - supabase/migrations/001_enable_postgis.sql
  - supabase/migrations/002_listings_schema.sql
  - supabase/migrations/003_scrape_audit_tables.sql
  - docs/legal/subito-scraping-note.md
  - scraper/src/shared/schema.ts
  - scraper/src/shared/dedupe.ts
  - scraper/src/shared/free-filter.ts
  - scraper/src/shared/validate-run.ts
  - scraper/src/shared/zone-tag.ts
  - scraper/src/shared/normalize.ts
  - scraper/src/shared/persist.ts
  - scraper/src/subito/categories.ts
  - scraper/src/subito/extract.ts
  - scraper/src/subito/crawler.ts
  - scraper/src/config.ts
  - scraper/src/worker.ts
  - scraper/src/alert/notify.ts
  - scraper/src/geo/centro-storico.geojson
  - scraper/src/geo/mestre-marghera.geojson
  - scraper/src/geo/lido-murano.geojson
  - scraper/src/geo/municipality-centroids.json
  - scraper/Dockerfile
  - scraper/package.json
  - scraper/.env.example
findings:
  critical: 4
  warning: 9
  info: 3
  total: 16
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-28T07:30:00Z  
**Depth:** standard  
**Files Reviewed:** 24  
**Status:** issues_found (advisory — non-blocking)

## Summary

Phase 01 delivers a coherent ingestion stack: PostGIS migrations, Zod-gated normalization, Crawlee fetch/extract separation, batch validation, and operator alerting. Unit tests cover core helpers well. The highest-risk gaps are **Supabase tables without RLS** (public API exposure), **eager Supabase client initialization in `config.ts`** (crawl-only paths fail without DB creds), **uncaught Zod throws in `persistBatch`** (partial writes + misleading run audit on mid-batch failure), and a **free-filter false positive** on common Italian phrasing (“non vendo”). Several operational edge cases (bootstrap count threshold, blocked-session drops, non-transactional batch persist) should be hardened before sustained production cadence.

## Critical Issues

### CR-01: Public tables have no Row Level Security

**File:** `supabase/migrations/002_listings_schema.sql:5`, `supabase/migrations/003_scrape_audit_tables.sql:1`
**Issue:** `listings`, `scrape_runs`, and `scrape_rejects` are created without `ENABLE ROW LEVEL SECURITY` or policies. On Supabase, public-schema tables without RLS remain accessible via the anon/authenticated API keys with default grants — any client-embedded anon key could read or mutate listing data and audit rows.
**Fix:**
```sql
-- After each CREATE TABLE in migrations (or a follow-up migration):
alter table public.listings enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.scrape_rejects enable row level security;

-- Example read-only policy for Phase 2 map (authenticated/anon read active listings):
create policy "public read active listings"
  on public.listings for select
  using (status = 'active');

-- No insert/update/delete policies for anon/authenticated — worker uses service role only.
```

### CR-02: `config.ts` eagerly requires Supabase env on any import

**File:** `scraper/src/config.ts:12-16`, `scraper/src/subito/crawler.ts:2`
**Issue:** `supabaseAdmin` is constructed at module load via `requireEnv('SUPABASE_URL')` and `requireEnv('SUPABASE_SERVICE_ROLE_KEY')`. `crawler.ts` imports `getProxyUrl` from the same module, so **any crawl path** (including spike/local extract verification) throws before Playwright starts if Supabase env is unset — matching the Plan 02 blocker but caused by module structure, not missing operator config alone.
**Fix:** Split config into lazy factories:
```typescript
// config/supabase.ts
let _client: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// config/proxy.ts — no Supabase import
export function getProxyUrl(): string | undefined { /* ... */ }
```

### CR-03: Zod validation throws uncaught inside `persistBatch`

**File:** `scraper/src/shared/normalize.ts:40`, `scraper/src/shared/persist.ts:97-114`, `scraper/src/worker.ts:167-173`
**Issue:** `normalizeRawListing` returns `{ reject }` for price-filter failures but calls `CanonicalListingSchema.parse()` for everything else — invalid `photo_url`, out-of-bounds coords, or malformed dates **throw**. `persistBatch` has no try/catch, so one bad card aborts the loop. Listings processed before the throw may already be upserted; the worker `catch` then records `listingsFound: 0`, misrepresenting audit data and violating the “all-or-nothing batch” intent from D-20 for non-validation failures.
**Fix:**
```typescript
// normalize.ts — treat schema failures as rejects
export function normalizeRawListing(raw: RawListing): NormalizeResult {
  // ... existing filter + candidate build ...
  const parsed = CanonicalListingSchema.safeParse(candidate);
  if (!parsed.success) {
    return { reject: `schema: ${parsed.error.issues[0]?.message ?? 'invalid listing'}` };
  }
  return parsed.data;
}
```

### CR-04: Free filter false-positive on “non vendo” (not for sale)

**File:** `scraper/src/shared/free-filter.ts:8`
**Issue:** Pattern `/\bvend/i` matches the prefix of Italian **“vendo”** and **“non vendo”** (“I'm not selling / giving away”). Legitimate regalo listings often use “non vendo, regalo” to clarify the item is free — these are incorrectly rejected (SCRP-05 false negative).
**Fix:**
```typescript
const PRICE_PATTERNS = [
  // ... existing patterns ...
  /\bvend(?:o|esi|ita)\b/i,  // replace bare /\bvend/i
];
// Add allowlist pass before pattern loop:
const ALLOWLIST = [/\bnon\s+vendo\b/i, /\bnon\s+in\s+vendita\b/i];
if (ALLOWLIST.some((p) => p.test(text))) return null;
```

## Warnings

### WR-01: `validateBatch` computes mean but labels it “median”

**File:** `scraper/src/shared/validate-run.ts:8-17`, `scraper/src/worker.ts:97-101`
**Issue:** Trailing “median” is the arithmetic mean of up to 7 prior `listings_found` values. Failure messages and alert copy say “median” while the gate uses mean — skewed history can produce thresholds that differ materially from a true median.
**Fix:** Replace reduce/average with sorted middle value, or rename reason strings and alert copy to “trailing average.”

### WR-02: `parseItalianPostedAt` silently defaults unparseable dates to `now`

**File:** `scraper/src/subito/extract.ts:55-60`
**Issue:** When posted-at text is neither “Oggi/Ieri” nor `Date.parse`-able, the function returns `now`. That sets incorrect `posted_at` and `expires_at` (+48h), keeping misdated listings active longer than intended.
**Fix:** Return `null` or throw from extract when date is unparseable; reject in normalize with `{ reject: 'unparseable posted_at' }`.

### WR-03: Blocked crawler sessions drop category requests without retry

**File:** `scraper/src/subito/crawler.ts:32-36`
**Issue:** When page title contains “blocked”, the handler retires the session and returns without re-enqueueing the URL. That category contributes zero listings with no explicit failure signal beyond lower counts — easy to misread as a thin feed rather than a block.
**Fix:** Throw a typed `BlockedError` or call `session.markBad()` and rethrow so Crawlee retries with a fresh session; increment a blocked counter surfaced in scrape_runs.

### WR-04: `persistBatch` is not transactional

**File:** `scraper/src/shared/persist.ts:85-116`
**Issue:** Each listing is upserted independently. A mid-batch error (network, Zod throw, DB constraint) leaves prior rows committed while the scrape run is marked failed — inconsistent with batch-gate semantics for non-validation failures.
**Fix:** Wrap batch in a Postgres transaction via Supabase RPC, or track progress and roll back on failure; at minimum, record partial counts in `finishScrapeRun` on error.

### WR-05: Bootstrap validation may fail thin first runs

**File:** `scraper/src/shared/validate-run.ts:8-18`
**Issue:** With no prior successful runs, bootstrap median is hard-coded to 50, requiring ≥25 parsed listings. A healthy but sparse day on Subito (or partial blocks) fails validation and triggers alerts with zero persists — potentially noisy on cold start.
**Fix:** Lower bootstrap floor (e.g. min 5) until N successful runs exist, or seed an initial successful run after manual verification.

### WR-06: `content_hash` dedupe skips re-application of free filter

**File:** `scraper/src/shared/dedupe.ts:4-6`, `scraper/src/shared/persist.ts:49-50`
**Issue:** Hash covers `title|photo_url|lat|lng` only. If a listing later adds price language in the description on Subito, re-scrape returns `skipped` and never re-runs `isMislabeledFree` — stale paid listings can remain `active`.
**Fix:** Include normalized description snippet in hash, or always re-run free filter before skip decision even when hash matches.

### WR-07: Dockerfile lacks `.dockerignore` and hard-codes cron

**File:** `scraper/Dockerfile:10-15`
**Issue:** `COPY . .` after `npm ci` can copy local `node_modules/`, `storage/`, and Crawlee artifacts into the image. `ENV CRON_ENABLED=true` prevents one-shot container runs without an override.
**Fix:** Add `.dockerignore` (`node_modules`, `storage`, `.env`); set `CRON_ENABLED` via orchestrator env, not Dockerfile default.

### WR-08: Geography WKT string may not cast correctly via PostgREST

**File:** `scraper/src/shared/persist.ts:68-71`
**Issue:** Upsert sends `geom` as plain text `SRID=4326;POINT(lng lat)`. PostgREST/Supabase may reject or store invalid geography without explicit cast — breaking Phase 2 GiST bbox queries if silently null.
**Fix:** Verify against live Supabase; prefer `supabase.rpc('upsert_listing_with_geom', …)` using `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`, or documented `{ type: 'Point', coordinates: [lng, lat] }` GeoJSON form if supported.

### WR-09: Worker error path reports `listingsFound: 0` after partial crawl/persist

**File:** `scraper/src/worker.ts:167-173`
**Issue:** Generic `catch` always writes `listingsFound: 0` even when failure occurs during `persistBatch` after a successful crawl — corrupts trailing median history used by the validation gate.
**Fix:** Hoist `rawListings.length` (and partial stats) into scope visible to `catch`; pass actual counts to `finishScrapeRun`.

## Info

### IN-01: Legal note references wrong `.env.example` path

**File:** `docs/legal/subito-scraping-note.md:39`
**Issue:** Document says “See `.env.example` at repo root”; actual file is `scraper/.env.example`.
**Fix:** Update path in D-22 note.

### IN-02: Zone polygons are coarse axis-aligned boxes

**File:** `scraper/src/geo/centro-storico.geojson:14-18`
**Issue:** Hand-drawn rectangles may mis-tag edge addresses or overlap at boundaries (first-match wins in `tagZone`). Acknowledged in Plan 03 summary; acceptable for MVP with manual QA.
**Fix:** Replace with OSM-derived boundaries when production filter reliance increases.

### IN-03: `console.log`/`console.error` throughout worker and alert paths

**File:** `scraper/src/worker.ts:106-165`, `scraper/src/alert/notify.ts:106-120`
**Issue:** Structured logging not used — acceptable for MVP worker but complicates log aggregation on Fly/Hetzner.
**Fix:** Introduce a minimal JSON logger when deploying to production.

---

_Reviewed: 2026-07-28T07:30:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
