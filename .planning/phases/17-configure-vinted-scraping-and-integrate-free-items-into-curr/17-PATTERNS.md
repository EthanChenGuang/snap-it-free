# Phase 17: Vinted Scraping & Subito Category Integration - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 28 new/modified files
**Analogs found:** 26 / 28

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scraper/scripts/spike-vinted-catalog.mjs` | utility | batch / transform | `scraper/scripts/spike-subito-http-category.mjs` | exact |
| `scraper/src/vinted/crawler.ts` | service | streaming / batch | `scraper/src/subito/crawler.ts` | exact |
| `scraper/src/vinted/catalog-api.ts` | utility | transform | `scraper/src/subito/http-extract.ts` (URL→params) | role-match |
| `scraper/src/vinted/http-extract.ts` | utility | transform | `scraper/src/subito/http-extract.ts` | exact |
| `scraper/src/vinted/enrich.ts` | service | request-response | `scraper/src/subito/crawler.ts` (detail Playwright path) | role-match |
| `scraper/src/vinted/filters.ts` | utility | transform | `scraper/src/subito/fallback-queue.ts` + `scraper/src/shared/free-filter.ts` | partial |
| `scraper/src/vinted/url-template.ts` | utility | transform | `lib/admin/subito-regalo-catalog.ts` (`generateRegaloUrls`) | role-match |
| `scraper/src/vinted/known-set.ts` | utility | CRUD | `scraper/src/subito/known-set.ts` | exact |
| `scraper/src/vinted/normalize.ts` | utility | transform | `scraper/src/shared/normalize.ts` + `scraper/src/subito/normalize.ts` | role-match |
| `scraper/src/worker.ts` | controller | event-driven | itself (`subito` branch in `runSourceScrape`) | exact |
| `scraper/src/shared/schema.ts` | model | validation | itself (`ListingSource` enum) | exact |
| `scraper/src/shared/persist.ts` | service | CRUD | itself (route normalize by source) | partial |
| `lib/listings/types.ts` | model | — | itself | exact |
| `lib/listings/schema.ts` | model | validation | `scraper/src/shared/schema.ts` | exact |
| `supabase/migrations/*_listing_source_vinted.sql` | migration | — | `supabase/migrations/002_listings_schema.sql` | partial |
| `lib/listings/canonical-categories.ts` | utility | transform | itself (`facebook` stub branch) | exact |
| `lib/listings/vinted-category-map.ts` | config | — | `INFERRED_CATEGORY_TO_SLUG` in `canonical-categories.ts` | role-match |
| `lib/admin/vinted-recommended-seed.ts` | config | — | `lib/admin/subito-recommended-seed.ts` | exact |
| `lib/listings/canonical-categories.test.ts` | test | — | itself | exact |
| `scraper/src/vinted/http-extract.test.ts` | test | — | `scraper/src/subito/http-extract.test.ts` | exact |
| `scraper/src/vinted/filters.test.ts` | test | — | `scraper/src/shared/schema.test.ts` | role-match |
| `scraper/fixtures/vinted-*.json` | config | file-I/O | `scraper/fixtures/subito-category-next-data-fragment.json` | exact |
| `components/listings/ListListingCard.tsx` | component | display | itself (FREE badge span) | partial |
| `components/admin/SourceDetailClient.tsx` | component | CRUD | itself (`isSubito` matrix branch) | exact |
| `components/admin/VintedUrlMatrix.tsx` (or generalize `RegaloUrlMatrix`) | component | CRUD | `components/admin/RegaloUrlMatrix.tsx` | exact |
| `lib/listings/external-url.ts` | utility | request-response | itself (`ALLOWED_HOSTS`) | partial |
| `components/detail/DetailSourceIdentity.tsx` | component | display | itself (source label branch) | partial |
| `lib/admin/url-validate.ts` | utility | request-response | itself (`vinted` host allowlist) | exact |

## Pattern Assignments

### `scraper/scripts/spike-vinted-catalog.mjs` (utility, batch)

**Analog:** `scraper/scripts/spike-subito-http-category.mjs`

**Imports + artifact paths** (lines 1–17):
```javascript
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotScraping } from 'got-scraping';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-SPIKE-VINTED-CATALOG.md',
);
const FIXTURE_DIR = join(REPO_ROOT, 'scraper/fixtures');
```

**TLS + wall-time gate** (lines 37–43):
```javascript
const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};
const WALL_TIME_PASS_MS = 3000; // +1s vs Subito for cookie warm-up
```

**Per-URL probe loop + PASS/FAIL artifact** (lines 146–177 pattern from Subito spike):
```javascript
async function fetchCategory(label, url, proxyUrl) {
  const row = { label, url, status: 0, wallMs: 0, blocked: false, pass: false };
  const requestOptions = { url, headerGeneratorOptions: TLS_OPTIONS, timeout: { request: 15000 } };
  if (proxyUrl) requestOptions.proxyUrl = proxyUrl;
  const t0 = performance.now();
  const res = await gotScraping(requestOptions);
  row.wallMs = Math.round(performance.now() - t0);
  row.status = res.statusCode ?? 0;
  row.blocked = row.status === 403 || /blocked|captcha|access denied/i.test(html.slice(0, 5000));
  // ... parse catalog API after session warm-up; write SPIKE_MD with **Verdict:** PASS/FAIL
}
```

---

### `scraper/src/vinted/crawler.ts` (service, streaming/batch)

**Analog:** `scraper/src/subito/crawler.ts`

**Imports** (lines 1–24):
```typescript
import {
  HttpCrawler,
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
} from 'crawlee';
import { getProxyFatalFailure, ProxyQuotaFatalError } from '../shared/proxy-errors.js';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import { getProxyUrl, getUseHttpCrawlerMode, isHttpCrawlerEnabled, type UseHttpCrawlerMode } from '../config.js';
import { applyEarlyStop, type EarlyStopListing } from '../subito/early-stop.js';
import { detailBudgetCap, FALLBACK_CONCURRENCY, selectDetailCandidates, shouldVisitDetail } from '../subito/fallback-queue.js';
```

**Public export signature** (lines 581–586):
```typescript
export async function runVintedCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
  options: RunVintedCrawlerOptions = {},
): Promise<CrawlResult> {
```

**HttpCrawler session pool** (lines 343–348):
```typescript
const httpCrawler = new HttpCrawler({
  requestQueue: categoryQueue,
  proxyConfiguration,
  useSessionPool: true,
  persistCookiesPerSession: true,
  sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
```

**Vinted-specific delta:** After warm-up GET on admin catalog URL, same session calls `/api/v2/catalog/items` (not `processCategoryHtml` on `__NEXT_DATA__`). Reuse block-retry Playwright path (lines 387–456) and detail enrichment queue (lines 464–505).

---

### `scraper/src/vinted/catalog-api.ts` (utility, transform)

**Analog:** `scraper/src/subito/http-extract.ts` (URL parsing section)

**URL → API params mapping** (from RESEARCH.md Pattern 1 — mirror structure):
```typescript
export function catalogUrlToApiParams(catalogUrl: string): URLSearchParams {
  const u = new URL(catalogUrl);
  const params = new URLSearchParams();
  params.set('per_page', '96');
  params.set('page', '1');
  params.set('order', u.searchParams.get('order') ?? 'newest_first');
  params.set('currency', 'EUR');
  for (const id of u.searchParams.getAll('catalog[]')) {
    params.append('catalog_ids', id);
  }
  const pathMatch = u.pathname.match(/\/catalog\/(\d+)/);
  if (pathMatch && !params.has('catalog_ids')) {
    params.set('catalog_ids', pathMatch[1]);
  }
  return params;
}
```

---

### `scraper/src/vinted/http-extract.ts` (utility, transform)

**Analog:** `scraper/src/subito/http-extract.ts`

**Error class pattern** (lines 12–20):
```typescript
export class CategoryParseError extends Error {
  constructor(
    message: string,
    public readonly reason: 'missing_api_data' | 'empty_listings' | 'parse_error',
  ) {
    super(message);
    this.name = 'CategoryParseError';
  }
}
```

**Map API item → RawListing** (adapt lines 104–137 from Subito `mapAdItem`):
```typescript
function mapCatalogItem(item: VintedCatalogItem, sourceCategoryUrl: string): CategoryJsonListing | null {
  const external_id = String(item.id);
  const title = item.title?.trim() ?? '';
  const external_url = item.url ?? `https://www.vinted.it${item.path}`;
  const photo_url = item.photo?.url ?? item.photos?.[0]?.url ?? '';
  const price = item.price?.amount ?? '';
  if (!external_id || !title || !photo_url) return null;
  // posted_at, catalog_id, coords filled by enrich.ts — omit here if absent (D-17-02)
  return { external_id, title, photo_url, external_url, lat: null, lng: null, posted_at: '', price, source_category_url: sourceCategoryUrl };
}
```

**Field completeness scoring** (lines 140–150):
```typescript
function fieldCompleteness(listings: CategoryJsonListing[]): number {
  if (listings.length === 0) return 0;
  const requiredPerListing = 5;
  let filled = 0;
  for (const listing of listings) {
    if (listing.external_id) filled += 1;
    if (listing.title) filled += 1;
    if (listing.photo_url) filled += 1;
    if (listing.posted_at) filled += 1;
    if (listing.price !== undefined && listing.price !== '') filled += 1;
  }
  return filled / (listings.length * requiredPerListing);
}
```

---

### `scraper/src/vinted/enrich.ts` (service, request-response)

**Analog:** `scraper/src/subito/crawler.ts` detail Playwright path (lines 484–505) + Subito centroid lookup in `http-extract.ts` (lines 96–124)

**Detail budget + defer** (from `subito/crawler.ts` lines 464–481):
```typescript
const detailBudget = detailBudgetCap(listingsSeenThisRun);
const { selected: detailSelected, deferred: detailDeferred } = selectDetailCandidates(workQueue, detailBudget);
for (const entry of detailDeferred) {
  rawListings.push(toRawListing(entry)); // defer overflow to next run
}
```

**Centroid fallback** (from `subito/http-extract.ts` lines 122–124):
```typescript
const municipalityText = sellerCityFromUserApi(user);
const centroid = lookupMunicipalityCentroid(municipalityText);
return { lat: centroid?.lat ?? null, lng: centroid?.lng ?? null };
```

**Vinted delta:** Fetch `/api/v2/users/{id}` for city; parse item HTML for `catalog_id`, `shipping.type`, `posted_at`. Prefer pickup location over seller profile city (D-17-13).

---

### `scraper/src/vinted/filters.ts` (utility, transform)

**Analog:** `scraper/src/subito/fallback-queue.ts` (price ambiguity) + RESEARCH `isFreePrice`

**€0 gate — no title fallback** (D-17-01/02/04):
```typescript
export function isFreePrice(amount: string | number | null | undefined): boolean {
  if (amount == null || amount === '') return false;
  return Number.parseFloat(String(amount)) === 0;
}

export function rejectReasonIfNotFree(amount: string | number | null | undefined): 'not_free' | null {
  if (!isFreePrice(amount)) return 'not_free';
  return null;
}
```

**Contrast with Subito ambiguous price** (`fallback-queue.ts` lines 11–19) — Vinted must **reject**, not visit detail for ambiguous price:
```typescript
export function isPriceAmbiguousOrMissing(price: string | undefined): boolean {
  if (price === undefined || price.trim() === '') return true;
  // Subito: may defer to detail — Vinted: reject at extract (D-17-02)
}
```

---

### `scraper/src/vinted/url-template.ts` + `lib/admin/vinted-recommended-seed.ts` (config)

**Analog:** `lib/admin/subito-recommended-seed.ts` + `lib/admin/subito-regalo-catalog.ts`

**Seed module pattern** (lines 1–25 of `subito-recommended-seed.ts`):
```typescript
import { SUBITO_REGALO_CATALOG, SUBITO_CITY_SLUGS, generateRegaloUrls } from './subito-regalo-catalog';

export const RECOMMENDED_SUBITO_SEED_URLS: readonly string[] = generateRegaloUrls(
  SUBITO_CITY_SLUGS,
  ALL_CATEGORY_SLUGS,
);
export const RECOMMENDED_SEED_COUNT = RECOMMENDED_SUBITO_SEED_URLS.length;
```

**Vinted equivalent:** `buildDefaultVintedUrl(subitoSlug, city)` → `https://www.vinted.it/catalog/{id}-{slug}?order=newest_first` × 17 slugs × 2 cities = 34 URLs. Export `RECOMMENDED_VINTED_SEED_URLS` mirroring above.

**URL generation loop** (`subito-regalo-catalog.ts` lines 74–80):
```typescript
export function generateRegaloUrls(cities: readonly SubitoCitySlug[], slugs: readonly string[]): string[] {
  const urls: string[] = [];
  for (const city of cities) {
    const entry = getCityBySubitoSlug(city);
    for (const slug of slugs) {
      urls.push(buildRegaloCategoryUrl(entry.regionSlug, slug, city));
    }
  }
  return urls;
}
```

---

### `scraper/src/vinted/known-set.ts` (utility, CRUD)

**Analog:** `scraper/src/subito/known-set.ts`

**Re-export or thin wrapper** (entire file — 24 lines):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export async function loadKnownListingSet(
  supabase: SupabaseClient,
  source = 'subito',
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('listings')
    .select('external_id, crawl_content_hash')
    .eq('source', source);
  // ... build Map
}
```

**Vinted file:** Re-export from `../subito/known-set.js` with default `source='vinted'` or duplicate with no changes except import path in crawler.

---

### `scraper/src/vinted/normalize.ts` (utility, transform)

**Analog:** `scraper/src/shared/normalize.ts` + `scraper/src/subito/normalize.ts`

**Persist normalize entry** (`normalize.ts` lines 18–55):
```typescript
export function normalizeRawListing(raw: RawListing): NormalizeResult {
  const rejectReason = isMislabeledFree(raw.title, raw.description);
  if (rejectReason) return { reject: rejectReason };

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    // ...
    category: extractCategoryFromSubitoUrl(raw.external_url),
  };
  candidate.content_hash = contentHash(candidate);
  candidate.crawl_content_hash = crawlHashForListing(raw);
  return CanonicalListingSchema.parse(candidate);
}
```

**Vinted delta:** `source: 'vinted'`, category via `mapVintedCatalogToSlug(catalogId)` + `resolveCanonicalCategorySlug`, city from URL template metadata + JSON validation, reject coords outside bbox via `CanonicalListingSchema.superRefine`.

---

### `scraper/src/worker.ts` (controller, event-driven)

**Analog:** itself — extend existing `subito` branch

**Known-set + crawler routing** (lines 331–357):
```typescript
const knownMap =
  sourceSlug === 'subito' ? await loadKnownListingSet(supabase, sourceSlug) : new Map();

if (sourceSlug === 'subito') {
  const fallbackResult = await runSubitoCrawlWithProxyFallback(
    runSubitoCrawler,
    config.urls,
    config.preset,
    config.proxyUrl,
    { knownMap, earlyStopK: config.earlyStopK, isFullRefresh, mode: crawlMode, runId: run.id },
  );
  crawlResult = fallbackResult.crawlResult;
  fallbackDegraded = fallbackResult.fallbackDegraded;
} else {
  throw new Error(`No crawler implementation for source: ${sourceSlug}`);
}
```

**Vinted branch:** Add `sourceSlug === 'vinted'` parallel block calling `runVintedCrawlWithProxyFallback(runVintedCrawler, ...)`. Extend knownMap line to `['subito', 'vinted'].includes(sourceSlug)`.

**Proxy fallback wrapper** (`worker-proxy-fallback.ts` lines 33–62):
```typescript
export async function runSubitoCrawlWithProxyFallback(
  runSubitoCrawler: RunSubitoCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  try {
    const crawlResult = await runSubitoCrawler(urls, preset, proxyUrl, options);
    return { crawlResult, fallbackDegraded: false };
  } catch (error) {
    if (!isProxyQuotaFatalError(error)) throw error;
    const crawlResult = await runSubitoCrawler(urls, preset, undefined, options);
    return { crawlResult, fallbackDegraded: true, fallbackReason: PROXY_QUOTA_FALLBACK_REASON };
  }
}
```

Generalize type to `RunCrawlerFn` shared by Subito and Vinted.

---

### `scraper/src/shared/schema.ts` + `lib/listings/types.ts` + `lib/listings/schema.ts` (model)

**Analog:** themselves — atomic enum extension (D-17-23)

**Scraper zod enum** (`schema.ts` line 4):
```typescript
export const ListingSource = z.enum(['subito', 'facebook', 'ugc']);
```

**Frontend type** (`types.ts` line 1):
```typescript
export type ListingSource = 'subito' | 'facebook' | 'ugc';
```

**App read schema** (`lib/listings/schema.ts` line 3):
```typescript
export const ListingSourceSchema = z.enum(['subito', 'facebook', 'ugc']);
```

**All three** → add `'vinted'` in same commit as DB migration.

---

### `supabase/migrations/*_listing_source_vinted.sql` (migration)

**Analog:** `supabase/migrations/002_listings_schema.sql` (enum definition — partial)

**Original enum** (line 1):
```sql
create type listing_source as enum ('subito', 'facebook', 'ugc');
```

**No existing `ALTER TYPE ADD VALUE` in repo.** Standard Postgres pattern for Phase 17:
```sql
ALTER TYPE listing_source ADD VALUE IF NOT EXISTS 'vinted';
```

Also update seed in migration or follow-up: flip `scraper_sources` row `implementation_status='live'`, `enabled=false`, replace keyword URLs with category catalog templates (currently lines 201–205 in `018_scraper_admin.sql`).

---

### `lib/listings/canonical-categories.ts` (+ optional `vinted-category-map.ts`)

**Analog:** itself — `facebook` stub branch (lines 71–82)

**Current resolver** (lines 71–82):
```typescript
export function resolveCanonicalCategorySlug(
  input: CanonicalCategoryInput,
): SubitoRegaloSlug | null {
  const fromDb = normalizeCatalogSlug(input.category);
  if (fromDb) return fromDb;

  if (input.source === 'facebook') return null;

  const inferred = inferListingCategory(input.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];

  return null;
}
```

**Vinted branch** (extend `CanonicalCategoryInput` with `vintedCatalogId?: number | null`):
```typescript
if (input.source === 'vinted') {
  const fromVinted = mapVintedCatalogToSlug(input.vintedCatalogId);
  if (fromVinted) return fromVinted;
  const inferred = inferListingCategory(input.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];
  return null; // D-17-18 — no usato catch-all
}
```

**Mapping table pattern** (lines 46–52):
```typescript
export const INFERRED_CATEGORY_TO_SLUG = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  // ...
} as const satisfies Record<Exclude<ListingCategory, 'All'>, SubitoRegaloSlug>;
```

Add `VINTED_CATALOG_TO_SUBITO_SLUG: Record<number, SubitoRegaloSlug>` with `satisfies` + unit test (CAT-03).

---

### `lib/listings/canonical-categories.test.ts` (test)

**Analog:** itself

**Facebook stub test** (lines 44–52):
```typescript
it('returns null for facebook source stub (D-09)', () => {
  expect(
    resolveCanonicalCategorySlug({
      source: 'facebook',
      title: 'Chair free',
      category: null,
    }),
  ).toBeNull();
});
```

**Add parallel cases:** vinted catalog ID map hit, inference fallback, unmapped → null (not `usato`).

---

### `scraper/src/vinted/http-extract.test.ts` + fixtures (test)

**Analog:** `scraper/src/subito/http-extract.test.ts`

**Fixture-based parse test** (lines 12–31):
```typescript
describe('parseCategoryNextData', () => {
  it('extracts RawListing[] from fixture __NEXT_DATA__ without Playwright', () => {
    const html = loadFixtureHtml();
    const { listings, jsonFieldCompleteness } = parseCategoryNextData(html, SOURCE_URL);
    expect(listings.length).toBe(3);
    expect(jsonFieldCompleteness).toBeGreaterThan(0.9);
    expect(first.external_id).toBe('656979545');
    expect(first.price).toBe('0 €');
  });
});
```

**Vinted:** Load `scraper/fixtures/vinted-catalog-api-sample.json`; assert `parseCatalogApiResponse()` field mapping; separate fixture for item-detail fragment (shipping + catalog_id).

---

### `components/listings/ListListingCard.tsx` (component)

**Analog:** itself — FREE badge (lines 66–68)

**Existing FREE badge:**
```tsx
<span className="absolute left-3 top-3 z-20 rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
  {messages.listing.free}
</span>
```

**Source chip (D-17-26):** Add when `listing.source === 'vinted'` — Stitch monochrome chip `#f1f1f0`, adjacent to FREE badge (top-left stack or inline). Use `@theme` tokens / `bg-[#f1f1f0]` per DESIGN.md; label `"Vinted"` or localized via messages.

---

### `components/admin/SourceDetailClient.tsx` (+ `VintedUrlMatrix`)

**Analog:** itself + `RegaloUrlMatrix.tsx`

**Subito-only matrix gate** (lines 86–100, 223–230):
```typescript
const isSubito = initialSource.slug === 'subito';

const applyRecommendedSeed = () => {
  setTargetUrlsText(RECOMMENDED_SUBITO_SEED_URLS.join('\n'));
  setMatrixResetToken((token) => token + 1);
};

{isSubito ? (
  <RegaloUrlMatrix
    targetUrlsText={targetUrlsText}
    onTargetUrlsChange={setTargetUrlsText}
    onApplyRecommendedSeedClick={handleApplyRecommendedSeedClick}
    resetToAllChecked={matrixResetToken}
  />
) : null}
```

**Vinted parity (D-17-37):** Add `isVinted = initialSource.slug === 'vinted'`, import `RECOMMENDED_VINTED_SEED_URLS`, render `VintedUrlMatrix` (clone `RegaloUrlMatrix` chip-row pattern lines 129–157 using `SUBITO_REGALO_CATALOG` labels × Venice/Padova cities).

---

### `lib/listings/external-url.ts` + `components/detail/ScrapedListingShell.tsx`

**Analog:** themselves — scraped listing external open (D-17-28)

**Allowlist** (`external-url.ts` lines 1–16):
```typescript
const ALLOWED_HOSTS = new Set(['subito.it', 'www.subito.it']);

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}
```

**Add:** `'vinted.it'`, `'www.vinted.it'`.

**Claim handler** (`ScrapedListingShell.tsx` lines 23–27):
```typescript
const handleClaim = () => {
  if (canOpenExternal) {
    openExternalListingUrl(listing.external_url);
  }
};
```

No Vinted-specific detail shell — same `ScrapedListingShell` path when `source !== 'ugc'`.

---

### `lib/admin/url-validate.ts` (utility)

**Analog:** itself — host allowlist already includes vinted

**Allowlist** (lines 3–8):
```typescript
const HOST_ALLOWLIST: Record<string, RegExp> = {
  subito: /(^|\.)subito\.it$/i,
  facebook: /(^|\.)facebook\.com$/i,
  vinted: /(^|\.)vinted\.it$/i,
  // ...
};
```

**Optional path rule** (mirror Subito lines 36–38):
```typescript
if (slug === 'vinted' && !/^\/catalog\/\d+/i.test(parsed.pathname)) {
  return { ok: false, error: 'Vinted URLs must be catalog paths (/catalog/{id}-...)' };
}
```

---

## Shared Patterns

### HttpCrawler + session pool + proxy (all Vinted crawl code)

**Source:** `scraper/src/subito/crawler.ts` lines 343–383  
**Apply to:** `vinted/crawler.ts`, spike script

```typescript
const httpCrawler = new HttpCrawler({
  requestQueue: categoryQueue,
  proxyConfiguration,
  useSessionPool: true,
  persistCookiesPerSession: true,
  sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
  maxRequestRetries: crawleeOpts.maxRequestRetries,
  minConcurrency: crawleeOpts.minConcurrency,
  errorHandler({ request }, error) {
    proxyErrorHandler(request, error);
  },
  async requestHandler({ request, body, session, response }) {
    // warm-up + API extract
  },
});
```

### Incremental early-stop + known-set

**Source:** `scraper/src/subito/crawler.ts` `processCategoryHtml` (lines 203–217)  
**Apply to:** `vinted/crawler.ts`

```typescript
const early = applyEarlyStop({
  listings: parsed.listings,
  knownMap,
  earlyStopK,
  isFullRefresh,
});
```

### Persist + reject logging + translation queue

**Source:** `scraper/src/shared/persist.ts` lines 123–174  
**Apply to:** all sources via source-aware normalize

```typescript
for (const raw of rawListings) {
  const result = normalizeRawListing(raw); // route to vinted normalize when source=vinted
  if ('reject' in result) {
    await logReject(supabase, scrapeRunId, raw.external_id, result.reject, { /* snippet */ });
    stats.rejected += 1;
    continue;
  }
  // persistListing + translateBatch
}
```

### Venice zone tagging

**Source:** `scraper/src/worker.ts` lines 410–414 + `scraper/src/shared/zone-tag.ts`  
**Apply to:** Vinted listings with coords in Venice bbox (D-17-08)

```typescript
const zones = loadZonePolygons();
const withZone = withCoords.filter(
  (l) => l.lat != null && l.lng != null && tagZone(l.lat, l.lng, zones) != null,
);
```

### Canonical category filter pipeline (no FilterSheet changes)

**Source:** `lib/listings/subito-categories.ts` lines 31–44  
**Apply to:** Vinted listings automatically once `resolveCanonicalCategorySlug` handles `source: 'vinted'`

```typescript
const resolved = resolveCanonicalCategorySlug({
  source: listing.source ?? 'subito',
  title: listing.title,
  category: listing.category,
});
if (selected === 'usato') return resolved === 'usato' || resolved === null;
return resolved === selected;
```

### ListingSource enum sync (4 locations)

**Apply atomically in one wave:**
1. `supabase/migrations/*_listing_source_vinted.sql`
2. `scraper/src/shared/schema.ts`
3. `lib/listings/types.ts`
4. `lib/listings/schema.ts`

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scraper/src/vinted/catalog-api.ts` session-authenticated API call | utility | request-response | Subito uses embedded `__NEXT_DATA__` HTML only — no session→JSON API two-step exists |
| `ALTER TYPE listing_source ADD VALUE` migration | migration | — | No prior enum extension migration in repo; use Postgres standard + `002_listings_schema.sql` as type reference |

## Metadata

**Analog search scope:** `scraper/src/subito/`, `scraper/src/shared/`, `scraper/scripts/`, `lib/listings/`, `lib/admin/`, `components/listings/`, `components/admin/`, `components/detail/`, `supabase/migrations/`  
**Files scanned:** ~45  
**Pattern extraction date:** 2026-08-15
