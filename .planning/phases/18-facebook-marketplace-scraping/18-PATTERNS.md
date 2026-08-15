# Phase 18: Facebook Marketplace Scraping - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 32 new/modified files
**Analogs found:** 29 / 32

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scraper/scripts/spike-facebook-marketplace.mjs` | utility | batch / transform | `scraper/scripts/spike-vinted-catalog.mjs` | exact |
| `scraper/src/facebook/crawler.ts` | service | streaming / batch | `scraper/src/subito/crawler.ts` (Playwright paths) + `scraper/src/vinted/crawler.ts` | role-match |
| `scraper/src/facebook/session.ts` | service | request-response | `scraper/src/config-loader.ts` (`resolveProxyUrl`) + Playwright `addCookies` | partial |
| `scraper/src/facebook/graphql-extract.ts` | utility | transform | `scraper/src/vinted/http-extract.ts` | role-match |
| `scraper/src/facebook/filters.ts` | utility | transform | `scraper/src/vinted/filters.ts` | exact |
| `scraper/src/facebook/enrich.ts` | service | request-response | `scraper/src/vinted/enrich.ts` + `scraper/src/subito/crawler.ts` detail path | role-match |
| `scraper/src/facebook/url-template.ts` | utility | transform | `lib/admin/vinted-recommended-seed.ts` | role-match |
| `scraper/src/facebook/known-set.ts` | utility | CRUD | `scraper/src/subito/known-set.ts` | exact |
| `scraper/src/facebook/normalize.ts` | utility | transform | `scraper/src/vinted/normalize.ts` | exact |
| `scraper/src/worker.ts` | controller | event-driven | itself (`vinted` branch) | exact |
| `scraper/src/config-loader.ts` | service | CRUD | itself (`resolveProxyUrl` → add `resolveSessionEnc`) | partial |
| `lib/admin/crypto.ts` | utility | transform | itself (`encryptProxy` / `decryptProxy`) | exact |
| `lib/admin/facebook-recommended-seed.ts` | config | — | `lib/admin/vinted-recommended-seed.ts` | exact |
| `lib/admin/url-validate.ts` | utility | request-response | itself (`vinted` path regex branch) | exact |
| `lib/admin/schemas.ts` | model | validation | itself (`UpdateSourceSchema` + `proxy_url` in global config) | partial |
| `lib/listings/canonical-categories.ts` | utility | transform | itself (`vinted` branch) | exact |
| `lib/listings/facebook-category-map.ts` | config | — | `lib/listings/vinted-category-map.ts` | exact |
| `supabase/migrations/029_facebook_session_enc.sql` | migration | — | `app/api/admin/config/route.ts` (`proxy_enc` column usage) + `018_scraper_admin.sql` facebook seed | role-match |
| `app/api/admin/sources/[slug]/route.ts` | controller | request-response | `app/api/admin/config/route.ts` (encrypt-on-PATCH) | role-match |
| `app/api/admin/sources/[slug]/test-session/route.ts` | controller | request-response | `app/api/admin/sources/[slug]/validate-urls/route.ts` | role-match |
| `components/admin/SourceDetailClient.tsx` | component | CRUD | itself (`isVinted` + `VintedUrlMatrix` branch) | exact |
| `components/admin/FacebookUrlMatrix.tsx` | component | CRUD | `components/admin/VintedUrlMatrix.tsx` | exact |
| `components/listings/ListListingCard.tsx` | component | display | itself (`sourceVinted` chip) | exact |
| `lib/listings/external-url.ts` | utility | request-response | itself (vinted.it allowlist) | exact |
| `app/listing/[id]/page.tsx` | route | request-response | itself (`vinted` → `ScrapedListingShell`) | exact |
| `messages/en.ts`, `messages/it.ts`, `messages/zh.ts` | config | — | `sourceVinted` keys | exact |
| `lib/listings/canonical-categories.test.ts` | test | — | itself (vinted branch tests) | exact |
| `lib/listings/subito-categories.test.ts` | test | — | itself (facebook D-09 stub) | exact |
| `lib/admin/crypto.test.ts` | test | — | itself | exact |
| `scraper/fixtures/facebook-search-graphql-sample.json` | config | file-I/O | `scraper/fixtures/vinted-catalog-api-sample.json` | exact |
| `scraper/src/facebook/*.test.ts` | test | — | `scraper/src/vinted/filters.test.ts`, `http-extract.test.ts` | exact |
| `lib/admin/queries.ts` | service | CRUD | itself (`proxyConfigured` → add `sessionConfigured`) | partial |

## Pattern Assignments

### `scraper/scripts/spike-facebook-marketplace.mjs` (utility, batch)

**Analog:** `scraper/scripts/spike-vinted-catalog.mjs`

**Imports + artifact paths** (lines 10–22):
```javascript
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md',
);
const FIXTURE_DIR = join(REPO_ROOT, 'scraper/fixtures');
```

**Wave 0 Venice URLs** (D-18-30 — mirror TARGET_URLS structure from vinted spike lines 25–41):
```javascript
const TARGET_URLS = [
  { label: 'venice/gratis', url: 'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend' },
  { label: 'venice/regalo', url: 'https://www.facebook.com/marketplace/venice/search/?query=regalo&sortBy=creation_time_descend' },
  { label: 'venice/free', url: 'https://www.facebook.com/marketplace/venice/search/?query=free&sortBy=creation_time_descend' },
];
```

**Env gate for session + proxy** (adapt vinted lines 172–175):
```javascript
const proxyUrl = process.env.PROXY_URL ?? process.env.SCRAPER_PROXY_URL ?? null;
const sessionPath = process.env.FB_SESSION_JSON;
if (!sessionPath || !existsSync(sessionPath)) {
  console.error('FAIL: FB_SESSION_JSON required (operator Playwright storageState or cookie array)');
  process.exit(1);
}
if (!proxyUrl) {
  console.error('FAIL: PROXY_URL required for Facebook (D-18-08 — no direct fallback)');
  process.exit(1);
}
```

**Verdict artifact + exit code** (lines 402–515):
```javascript
const allPass = results.every((r) => r.pass);
const overallVerdict = allPass ? 'PASS' : 'FAIL';
// ... build markdown with **Verdict: ${overallVerdict}**
writeFileSync(SPIKE_MD, md, 'utf-8');
console.log(`\n=== OVERALL VERDICT: ${overallVerdict} ===`);
process.exit(allPass ? 0 : 1);
```

**FB delta:** Use Playwright (not got-scraping) for logged-in search; register `page.on('response')` for `/api/graphql/`; inject cookies from `FB_SESSION_JSON` before navigation. Wall-time gate 15s per URL (D-18-19), not 3s.

---

### `scraper/src/facebook/crawler.ts` (service, streaming/batch)

**Analog:** `scraper/src/subito/crawler.ts` Playwright paths (primary for FB) + `scraper/src/vinted/crawler.ts` orchestration

**PlaywrightCrawler primary setup** (from `subito/crawler.ts` lines 265–277):
```typescript
const crawler = new PlaywrightCrawler({
  requestQueue,
  proxyConfiguration,
  useSessionPool: true,
  persistCookiesPerSession: true,
  sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
  maxRequestRetries: crawleeOpts.maxRequestRetries,
  minConcurrency: 1, // D-18-13: concurrency 1 for FB
  maxConcurrency: 1,
  launchContext: { launchOptions: { headless: true } },
  async requestHandler({ page, session, request }) { /* ... */ },
});
```

**Public export signature** (mirror `vinted/crawler.ts` lines 289–294):
```typescript
export async function runFacebookCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'conservative', // D-18-14: conservative preset seeded
  proxyUrlOverride?: string,
  options: RunFacebookCrawlerOptions = {},
): Promise<CrawlResult> {
```

**Early-stop integration** (from `subito/crawler.ts` lines 203–217):
```typescript
const early = applyEarlyStop({
  listings: parsed.listings,
  knownMap,
  earlyStopK,
  isFullRefresh,
});
return {
  workQueue: early.workQueue,
  touchCandidates: early.touchCandidates,
  listingsSkippedAtCrawl: early.listingsSkippedAtCrawl,
  jsonFieldCompleteness: parsed.jsonFieldCompleteness,
  blocked: false,
  stoppedEarly: early.stoppedEarly,
};
```

**Detail visit cap** (from `subito/crawler.ts` lines 464–481 + `fallback-queue.ts` lines 37–39):
```typescript
const detailBudget = detailBudgetCap(listingsSeenThisRun); // Math.ceil(0.1 * listingsSeen)
const { selected: detailSelected, deferred: detailDeferred } = selectDetailCandidates(
  detailCandidatePool,
  detailBudget,
);
```

**FB deltas:**
- Playwright is **primary** (not HttpCrawler-first like Vinted/Subito).
- Inject operator session via `applySessionToContext()` before first URL (D-18-06).
- Pre-flight `probeFacebookSession()` before crawl loop (D-18-12); throw `session_expired` on login wall (D-18-09).
- Require `proxyUrl` in production — no Subito-style direct fallback (D-18-08).
- Dedup by `external_id` across overlapping query URLs per city (D-18-31).
- Page 1 only (D-18-17).

---

### `scraper/src/facebook/session.ts` (service, request-response)

**Analog:** `scraper/src/config-loader.ts` `resolveProxyUrl` (lines 36–56) + RESEARCH Pattern 1

**Decrypt-at-run pattern** (from `config-loader.ts`):
```typescript
function resolveProxyUrl(proxyEnc: EncryptedProxyPayload | null | undefined): string | undefined {
  const secretsKey = process.env.SCRAPER_SECRETS_KEY?.trim();
  if (proxyEnc && secretsKey) {
    try {
      return decryptProxy(proxyEnc, secretsKey);
    } catch {
      console.warn('[config-loader] Failed to decrypt proxy_enc — falling back to PROXY_URL env');
    }
  }
  return getProxyUrl();
}
```

**Session load from DB** (mirror above — use `decryptSession` instead):
```typescript
export async function loadFacebookSession(
  supabase: SupabaseClient,
  slug: string,
): Promise<SessionPayload> {
  const { data, error } = await supabase
    .from('scraper_sources')
    .select('session_enc')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data?.session_enc) throw new Error('session_missing');
  const secretsKey = process.env.SCRAPER_SECRETS_KEY?.trim();
  if (!secretsKey) throw new Error('SCRAPER_SECRETS_KEY not configured');
  const plaintext = decryptSession(data.session_enc as EncryptedSessionPayload, secretsKey);
  return JSON.parse(plaintext) as SessionPayload;
}
```

**Login wall detection signals** (D-18-09/12 — implement in probe; no existing analog):
- `page.url()` matches `/login/` or checkpoint title
- Missing `c_user` cookie after navigation
- GraphQL returns zero edges + login form in DOM

---

### `scraper/src/facebook/graphql-extract.ts` (utility, transform)

**Analog:** `scraper/src/vinted/http-extract.ts`

**Error class pattern** (from `vinted/http-extract.ts` lines 12–20):
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

**Map card → RawListing** (adapt vinted `mapCatalogItem` pattern from spike lines 100–111):
```typescript
function mapFacebookCard(node: Record<string, unknown>, sourceCategoryUrl: string): RawListing | null {
  const external_id = String(node.id ?? '');
  const title = String(node.marketplace_listing_title ?? node.custom_title ?? '');
  const photo_url = (node.primary_listing_photo as { image?: { uri?: string } })?.image?.uri ?? '';
  const price = (node.listing_price as { amount?: string })?.amount ?? '';
  const price_formatted = (node.listing_price as { formatted_amount?: string })?.formatted_amount ?? null;
  if (!external_id || !title || !photo_url) return null;
  return {
    external_id,
    title,
    photo_url,
    external_url: `https://www.facebook.com/marketplace/item/${external_id}/`,
    lat: null,
    lng: null,
    posted_at: '',
    price,
    source_category_url: sourceCategoryUrl,
    // stash for filters/normalize: price_formatted, category_id, delivery_types
  };
}
```

**Field completeness scoring** (from `vinted/http-extract.ts` / spike lines 124–128):
```typescript
function fieldCompleteness(listings: RawListing[]): number {
  if (listings.length === 0) return 0;
  const requiredPerListing = 5; // external_id, title, photo_url, price field, location
  // ... same ratio pattern as Subito/Vinted
}
```

---

### `scraper/src/facebook/filters.ts` (utility, transform)

**Analog:** `scraper/src/vinted/filters.ts`

**Vinted strict numeric gate** (lines 9–17 — FB extends with formatted_amount):
```typescript
export function isFreePrice(amount: string | number | null | undefined): boolean {
  if (amount == null || amount === '') return false;
  if (typeof amount === 'number') return amount === 0;
  const trimmed = String(amount).trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  return Number.parseFloat(trimmed) === 0;
}
```

**FB extension** (D-18-02 — accept localized formatted tokens; reject ambiguous):
```typescript
const FREE_FORMATTED = new Set(['free', 'gratis', 'gratuito']);

export function isFacebookFreePrice(
  amount: string | number | null | undefined,
  formatted?: string | null,
): boolean {
  if (isFreePrice(amount)) return true;
  if (formatted) {
    const norm = formatted.trim().toLowerCase().replace(/\s+/g, ' ');
    if (FREE_FORMATTED.has(norm)) return true;
    if (/^0([.,]00)?(\s*[€$])?$/.test(norm)) return true;
  }
  return false;
}

export function rejectReasonIfNotFacebookFree(
  amount: string | number | null | undefined,
  formatted?: string | null,
): 'not_free' | 'price_ambiguous' | null {
  if (amount == null && !formatted) return 'price_ambiguous';
  // reject negotiable/contact strings (D-18-03)
  return isFacebookFreePrice(amount, formatted) ? null : 'not_free';
}
```

**Local pickup gate** — re-export or mirror `isLocalPickup` from `scraper/src/vinted/filters.ts` (D-18-04 / D-17-15 parity).

---

### `scraper/src/facebook/enrich.ts` (service, request-response)

**Analog:** `scraper/src/vinted/enrich.ts` + `scraper/src/subito/crawler.ts` detail Playwright path (lines 505–537)

**Detail Playwright handler** (from `subito/crawler.ts`):
```typescript
const detailCrawler = new PlaywrightCrawler({
  requestQueue: detailQueue,
  proxyConfiguration,
  minConcurrency: FALLBACK_CONCURRENCY,
  maxConcurrency: FALLBACK_CONCURRENCY,
  async requestHandler({ page, request }) {
    const userData = request.userData as FallbackUserData;
    const { listing } = await extractFromDetailPage(page, userData.sourceCategoryUrl);
    if (!listing && userData.listing) {
      rawListings.push(toRawListing(userData.listing));
      return;
    }
    rawListings.push(listing);
  },
});
```

**Centroid fallback** — reuse `lookupMunicipalityCentroid` from Subito geo module (D-18-27). Prefer pickup/meet-up location over seller profile city (D-18-26, mirror Vinted D-17-13).

---

### `scraper/src/facebook/url-template.ts` + `lib/admin/facebook-recommended-seed.ts` (config)

**Analog:** `lib/admin/vinted-recommended-seed.ts`

**Seed city slugs** (lines 18–19):
```typescript
export const VINTED_SEED_CITY_SLUGS = ['venezia', 'padova'] as const satisfies readonly SubitoCitySlug[];
```

**FB equivalent** — 2 cities × 3 queries (D-18-22), not 17×2 category matrix:
```typescript
export const FACEBOOK_SEED_CITY_SLUGS = ['venice', 'padova'] as const;
export const FACEBOOK_SEARCH_QUERIES = ['gratis', 'regalo', 'free'] as const;

export function buildDefaultFacebookUrl(city: string, query: string): string {
  const params = new URLSearchParams({ query, sortBy: 'creation_time_descend' });
  return `https://www.facebook.com/marketplace/${city}/search/?${params.toString()}`;
}

export const RECOMMENDED_FACEBOOK_SEED_URLS: readonly string[] = FACEBOOK_SEED_CITY_SLUGS.flatMap(
  (city) => FACEBOOK_SEARCH_QUERIES.map((q) => buildDefaultFacebookUrl(city, q)),
); // 6 URLs
```

**Existing Venice-only seed** (`018_scraper_admin.sql` lines 187–191) — migration replaces with full 6-URL matrix.

---

### `scraper/src/facebook/known-set.ts` (utility, CRUD)

**Analog:** `scraper/src/subito/known-set.ts` (entire file — 24 lines)

```typescript
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

**FB file:** Re-export from `../subito/known-set.js` with default `source='facebook'` or thin duplicate.

---

### `scraper/src/facebook/normalize.ts` (utility, transform)

**Analog:** `scraper/src/vinted/normalize.ts`

**Free gate + host validation** (lines 49–60):
```typescript
export function normalizeVintedRawListing(raw: RawListing): NormalizeResult {
  if (!isFreePrice(raw.price)) {
    return { reject: 'not_free' };
  }
  try {
    const parsedHost = new URL(raw.external_url);
    if (parsedHost.protocol !== 'https:' || !/^([^/]*\.)?vinted\.it$/i.test(parsedHost.hostname)) {
      return { reject: 'invalid_external_host' };
    }
  } catch {
    return { reject: 'invalid_external_url' };
  }
```

**Category resolution** (lines 29–36 — adapt for FB):
```typescript
function resolveFacebookCategorySlug(raw: RawListing): string | null {
  const fromMap = mapFacebookCategoryToSlug(raw.facebook_category_id);
  if (fromMap) return fromMap;
  const inferred = inferListingCategory(raw.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];
  return null;
}
```

**FB deltas:** `source: 'facebook'`, host regex `facebook.com`, `external_url` canonical `https://www.facebook.com/marketplace/item/{id}/` (D-18-35), 48h TTL via `computeScrapedListingExpiresAt`.

---

### `scraper/src/worker.ts` (controller, event-driven)

**Analog:** itself — extend `vinted` branch pattern (lines 363–407)

**Known-set loading** (lines 363–366):
```typescript
const knownMap =
  sourceSlug === 'subito' || sourceSlug === 'vinted'
    ? await loadKnownListingSet(supabase, sourceSlug)
    : new Map();
```

**Add facebook:**
```typescript
const KNOWN_SET_SOURCES = ['subito', 'vinted', 'facebook'] as const;
const knownMap = KNOWN_SET_SOURCES.includes(sourceSlug as typeof KNOWN_SET_SOURCES[number])
  ? await loadKnownListingSet(supabase, sourceSlug)
  : new Map();
```

**New branch** (mirror lines 389–404):
```typescript
} else if (sourceSlug === 'facebook') {
  if (!config.proxyUrl) {
    throw new Error('Facebook crawl requires residential proxy (D-18-08)');
  }
  const session = await loadFacebookSession(supabase, sourceSlug);
  await probeFacebookSession(session, config.proxyUrl);
  const fallbackResult = await runFacebookCrawlWithProxyFallback(
    runFacebookCrawler,
    config.urls,
    config.preset,
    config.proxyUrl,
    { session, knownMap, earlyStopK: config.earlyStopK, isFullRefresh, mode: crawlMode, runId: run.id },
  );
  crawlResult = fallbackResult.crawlResult;
  fallbackDegraded = fallbackResult.fallbackDegraded;
}
```

**FB delta:** No proxy-quota direct fallback for Facebook (unlike Subito PROXY-C04). Session expiry fails run with `session_expired`, not degraded partial crawl.

---

### `lib/admin/crypto.ts` + `lib/admin/crypto.test.ts` (utility, transform)

**Analog:** itself — `encryptProxy` / `decryptProxy` (lines 19–39)

```typescript
export function encryptProxy(plaintext: string, keyBase64: string): EncryptedProxyPayload {
  const key = decodeKey(keyBase64);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') };
}
```

**Session wrappers** (D-18-11):
```typescript
export type EncryptedSessionPayload = EncryptedProxyPayload;

export function encryptSession(plaintextJson: string, keyBase64: string): EncryptedSessionPayload {
  return encryptProxy(plaintextJson, keyBase64);
}

export function decryptSession(payload: EncryptedSessionPayload, keyBase64: string): string {
  return decryptProxy(payload, keyBase64);
}
```

**Test extension** (from `crypto.test.ts` lines 7–15):
```typescript
it('roundtrips session JSON with SCRAPER_SECRETS_KEY fixture (D-18-11)', () => {
  const plaintext = JSON.stringify({ cookies: [{ name: 'c_user', value: '123', domain: '.facebook.com', path: '/' }] });
  const encrypted = encryptSession(plaintext, TEST_KEY);
  expect(decryptSession(encrypted, TEST_KEY)).toBe(plaintext);
});
```

---

### `supabase/migrations/029_facebook_session_enc.sql` (migration)

**Analog:** `proxy_enc` usage in `app/api/admin/config/route.ts` (lines 58–63) + facebook seed in `018_scraper_admin.sql` (lines 181–192)

**Column add:**
```sql
ALTER TABLE public.scraper_sources
  ADD COLUMN IF NOT EXISTS session_enc jsonb;

COMMENT ON COLUMN public.scraper_sources.session_enc IS
  'AES-256-GCM encrypted Playwright storageState or cookie JSON (operator-managed FB session)';
```

**Seed update** (D-18-23/32):
```sql
UPDATE public.scraper_sources
SET
  implementation_status = 'live',
  enabled = false,
  interval_minutes = 90,
  anti_block_preset = 'conservative',
  target_urls = ARRAY[
    'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/venice/search/?query=regalo&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/venice/search/?query=free&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/padova/search/?query=gratis&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/padova/search/?query=regalo&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/padova/search/?query=free&sortBy=creation_time_descend'
  ]
WHERE slug = 'facebook';
```

---

### `app/api/admin/sources/[slug]/route.ts` + `lib/admin/schemas.ts` (controller)

**Analog:** `app/api/admin/config/route.ts` encrypt-on-PATCH (lines 58–63)

**Extend UpdateSourceSchema:**
```typescript
export const UpdateSourceSchema = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(30).max(1440).optional(),
  anti_block_preset: antiBlockPresetSchema.optional(),
  target_urls: z.array(z.string().url()).min(1).optional(),
  session_json: z.string().max(65536).optional(), // raw JSON before encrypt; never returned decrypted on GET
});
```

**PATCH handler encrypt block** (mirror config route):
```typescript
if (parsed.data.session_json !== undefined) {
  const secretsKey = process.env.SCRAPER_SECRETS_KEY;
  if (!secretsKey) throw new Error('SCRAPER_SECRETS_KEY not configured');
  update.session_enc = encryptSession(parsed.data.session_json, secretsKey);
}
```

**GET response:** expose `session_configured: boolean` (like `proxy_configured`), never raw cookies.

---

### `components/admin/SourceDetailClient.tsx` + `FacebookUrlMatrix.tsx` (component)

**Analog:** itself — `isVinted` + `VintedUrlMatrix` (lines 88–90, 237–244)

**Source slug gates** (lines 88–90):
```typescript
const isSubito = initialSource.slug === 'subito';
const isVinted = initialSource.slug === 'vinted';
const hasUrlMatrix = isSubito || isVinted;
```

**Add Facebook:**
```typescript
const isFacebook = initialSource.slug === 'facebook';
const hasUrlMatrix = isSubito || isVinted || isFacebook;
```

**Recommended seed** (lines 101–104):
```typescript
const applyRecommendedSeed = () => {
  const seedUrls = isVinted ? RECOMMENDED_VINTED_SEED_URLS : RECOMMENDED_SUBITO_SEED_URLS;
  setTargetUrlsText(seedUrls.join('\n'));
  setMatrixResetToken((token) => token + 1);
};
```

**Matrix render** (lines 237–244):
```typescript
{isVinted ? (
  <VintedUrlMatrix
    targetUrlsText={targetUrlsText}
    onTargetUrlsChange={setTargetUrlsText}
    onApplyRecommendedSeedClick={handleApplyRecommendedSeedClick}
    resetToAllChecked={matrixResetToken}
  />
) : null}
```

**FacebookUrlMatrix** — clone `VintedUrlMatrix.tsx` chip-row pattern (lines 156–204) but replace 17 category chips with 3 query chips (`gratis`, `regalo`, `free`) × 2 city chips (`venice`, `padova`). Add **session upload field** + "Test session" button (D-18-10) — no analog in repo; PATCH `session_json` + call `POST /api/admin/sources/facebook/test-session`.

**Save payload extension** (lines 141–149):
```typescript
body: JSON.stringify({
  enabled,
  interval_minutes: interval,
  anti_block_preset: antiBlock,
  target_urls: urls,
  session_json: sessionText.trim() || undefined, // only when operator pasted new session
}),
```

---

### `lib/listings/canonical-categories.ts` + `facebook-category-map.ts` (utility, transform)

**Analog:** itself — `vinted` branch (lines 84–90) + `lib/listings/vinted-category-map.ts`

**Current facebook stub** (lines 82–83):
```typescript
if (input.source === 'facebook') return null;
```

**Replace with** (mirror vinted branch):
```typescript
if (input.source === 'facebook') {
  const fromFacebook = mapFacebookCategoryToSlug(input.facebookCategoryId);
  if (fromFacebook) return fromFacebook;
  const inferred = inferListingCategory(input.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];
  return null;
}
```

**Extend CanonicalCategoryInput:**
```typescript
/** Facebook marketplace_listing_category_id from GraphQL (D-18-49). */
facebookCategoryId?: string | number | null;
```

**Mapping table** (from `vinted-category-map.ts` lines 14–53):
```typescript
export const FACEBOOK_CATEGORY_TO_SUBITO_SLUG = {
  // Wave 0 harvested IDs — placeholder until spike confirms
  TBD_HOME: 'arredamento-casalinghi',
} as const satisfies Record<string | number, string>;

export function mapFacebookCategoryToSlug(
  categoryId: string | number | null | undefined,
): SubitoRegaloSlug | null {
  if (categoryId == null) return null;
  return FACEBOOK_CATEGORY_TO_SUBITO_SLUG[categoryId as keyof typeof FACEBOOK_CATEGORY_TO_SUBITO_SLUG] ?? null;
}
```

---

### `lib/listings/canonical-categories.test.ts` + `subito-categories.test.ts` (test)

**Analog:** themselves — update D-09 stub expectations

**Replace stub test** (`canonical-categories.test.ts` lines 45–52):
```typescript
// OLD: returns null for facebook source stub (D-09)
// NEW: map hit, inference fallback, unmapped → null
it('maps facebook category ID to Subito slug (CAT-01)', () => {
  expect(resolveCanonicalCategorySlug({
    source: 'facebook',
    title: 'Chair',
    category: null,
    facebookCategoryId: KNOWN_FB_ID,
  })).toBe('arredamento-casalinghi');
});
```

**Filter path** (`subito-categories.test.ts` lines 26–29):
```typescript
// OLD: returns false for facebook source with null category (D-09)
// NEW: facebook with resolved slug matches filter like vinted
```

---

### `lib/admin/url-validate.ts` (utility)

**Analog:** itself — `vinted` path regex (lines 11–12, 43–45)

```typescript
const VINTED_CATALOG_PATH_REGEX = /^\/catalog\/\d+/i;

if (slug === 'vinted' && !VINTED_CATALOG_PATH_REGEX.test(parsed.pathname)) {
  return { ok: false, error: 'Vinted URLs must use /catalog/{id} path' };
}
```

**Facebook branch** (D-18-24):
```typescript
const FACEBOOK_MARKETPLACE_SEARCH_REGEX = /^\/marketplace\/[a-z0-9-]+\/search\/?$/i;

if (slug === 'facebook') {
  if (!FACEBOOK_MARKETPLACE_SEARCH_REGEX.test(parsed.pathname)) {
    return { ok: false, error: 'Facebook URLs must be /marketplace/{city}/search/' };
  }
  if (!parsed.searchParams.has('query')) {
    return { ok: false, error: 'Facebook search URLs require query param' };
  }
}
```

Host allowlist already includes facebook (lines 3–8).

---

### `components/listings/ListListingCard.tsx` (component)

**Analog:** itself — Vinted source chip (lines 66–74)

```tsx
<div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1.5">
  <span className="rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
    {messages.listing.free}
  </span>
  {listing.source === 'vinted' && (
    <span className="rounded-md border border-outline-variant bg-[#f1f1f0] px-2 py-0.5 text-xs font-medium text-on-surface">
      {messages.listing.sourceVinted}
    </span>
  )}
</div>
```

**Add Facebook chip** (D-18-43):
```tsx
{listing.source === 'facebook' && (
  <span className="rounded-md border border-outline-variant bg-[#f1f1f0] px-2 py-0.5 text-xs font-medium text-on-surface">
    {messages.listing.sourceFacebook}
  </span>
)}
```

FREE badge unchanged — all FB persisted listings are free by definition (D-18-42).

---

### `lib/listings/external-url.ts` + `app/listing/[id]/page.tsx` (utility + route)

**Analog:** themselves — Vinted integration (Phase 17)

**Allowlist** (`external-url.ts` lines 1–6):
```typescript
const ALLOWED_HOSTS = new Set([
  'subito.it',
  'www.subito.it',
  'vinted.it',
  'www.vinted.it',
]);
```

**Add:** `'facebook.com'`, `'www.facebook.com'`.

**Detail routing** (`app/listing/[id]/page.tsx` lines 52–54):
```typescript
if (listing.source === 'subito' || listing.source === 'vinted') {
  return <ScrapedListingShell listing={listing} similarListings={similarListings} />;
}
```

**Extend:** `|| listing.source === 'facebook'` — same external claim flow (D-18-45).

---

### `messages/en.ts`, `messages/it.ts`, `messages/zh.ts` (config)

**Analog:** `sourceVinted` keys (e.g. `messages/en.ts` line 460)

```typescript
sourceVinted: 'Vinted',
// add:
sourceFacebook: 'Facebook',
```

Mirror in `it.ts` and `zh.ts` (I18N-01 partial).

---

## Shared Patterns

### PlaywrightCrawler + proxy + session pool

**Source:** `scraper/src/subito/crawler.ts` lines 265–277, 505–518  
**Apply to:** `facebook/crawler.ts` (primary path), spike script

```typescript
const proxyConfiguration = proxyUrl
  ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
  : undefined;

const crawler = new PlaywrightCrawler({
  proxyConfiguration,
  useSessionPool: true,
  persistCookiesPerSession: true,
  minConcurrency: 1,
  maxConcurrency: 1,
  launchContext: { launchOptions: { headless: true } },
});
```

### Incremental early-stop + known-set

**Source:** `scraper/src/subito/early-stop.ts` lines 30–63  
**Apply to:** `facebook/crawler.ts` after Wave 0 (D-18-18)

```typescript
export function applyEarlyStop(input: ApplyEarlyStopInput): ApplyEarlyStopResult {
  for (const listing of listings) {
    if (isKnownUnchanged(listing, knownMap)) {
      consecutiveKnown += 1;
      if (!isFullRefresh && consecutiveKnown >= earlyStopK) {
        stoppedEarly = true;
        break;
      }
      continue;
    }
    consecutiveKnown = 0;
    workQueue.push(listing);
  }
}
```

### AES-256-GCM encryption at rest

**Source:** `lib/admin/crypto.ts` lines 19–39  
**Apply to:** `session_enc` (D-18-11), admin PATCH, worker decrypt

### Worker tri-source routing + proxy fallback wrapper

**Source:** `scraper/src/worker.ts` lines 373–407 + `scraper/src/worker-proxy-fallback.ts` lines 15–48  
**Apply to:** add `facebook` branch; generalize `runFacebookCrawlWithProxyFallback` (no direct-IP fallback for FB)

### Persist + reject logging + translation queue

**Source:** `scraper/src/shared/persist.ts` (vinted branch at line 140)  
**Apply to:** `normalizeFacebookRawListing` route in persist

### Venice zone tagging

**Source:** `scraper/src/worker.ts` lines 460–464 + `scraper/src/shared/zone-tag.ts`  
**Apply to:** FB listings with coords in Venice bbox (D-18-28); Padova skips zones

### Canonical category filter pipeline (no FilterSheet changes)

**Source:** `lib/listings/subito-categories.ts` — `listingMatchesCategoryFilter` via `resolveCanonicalCategorySlug`  
**Apply to:** FB listings once stub replaced (D-18-63)

### Operator auth on admin mutations

**Source:** `app/api/admin/sources/[slug]/route.ts` lines 25–27  
**Apply to:** session upload, test-session endpoint

```typescript
const session = await getOperatorSession();
if (!session) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scraper/src/facebook/session.ts` pre-flight probe | service | request-response | No FB login-wall probe exists; proxy_enc pattern covers decrypt only |
| `app/api/admin/sources/[slug]/test-session/route.ts` | controller | request-response | No "test credentials before save" endpoint; validate-urls is closest partial |
| `components/admin/SourceDetailClient.tsx` session upload UI | component | CRUD | Subito/Vinted admin has URL matrix only — session field is new for FB |

## Metadata

**Analog search scope:** `scraper/src/subito/`, `scraper/src/vinted/`, `scraper/src/shared/`, `scraper/scripts/`, `lib/listings/`, `lib/admin/`, `components/listings/`, `components/admin/`, `app/api/admin/`, `app/listing/`, `supabase/migrations/`, Phase 17 `17-PATTERNS.md`  
**Files scanned:** ~52  
**Pattern extraction date:** 2026-08-15
