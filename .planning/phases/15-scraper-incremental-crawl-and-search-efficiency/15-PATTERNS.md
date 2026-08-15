# Phase 15: Scraper Incremental Crawl & Search Efficiency - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 24
**Analogs found:** 23 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scraper/scripts/spike-subito-http-category.mjs` | utility (script) | request-response + file-I/O | `scraper/scripts/spike-subito-padova.mjs` | exact |
| `scraper/src/subito/http-extract.ts` | service / utility | transform | `scraper/src/subito/extract.ts` | exact |
| `scraper/src/subito/crawl-hash.ts` | utility | transform | `scraper/src/shared/dedupe.ts` | exact |
| `scraper/src/subito/known-set.ts` | service | CRUD (read) | `scraper/src/shared/persist.ts` + `config-loader.ts` | role-match |
| `scraper/src/subito/crawler.ts` | service | request-response / batch | itself (`runSubitoCrawler`) | exact |
| `scraper/src/subito/extract.ts` | service | transform | itself (centroid / cookie helpers) | exact |
| `scraper/src/shared/persist.ts` | service | CRUD | itself (hash-match touch) | exact |
| `scraper/src/shared/validate-run.ts` | utility | transform | itself (`validateBatch`) | exact |
| `scraper/src/config-loader.ts` | service | CRUD (read) | itself (`loadSourceConfig`) | exact |
| `scraper/src/worker.ts` | service / controller | batch / request-response | itself (`runSourceScrape` / `finishScrapeRun`) | exact |
| `supabase/migrations/023_phase15_crawl_metrics.sql` | migration | CRUD (schema) | `020_subito_location_category.sql` + `018_scraper_admin.sql` | exact |
| `lib/admin/schemas.ts` | config / validation | request-response | itself (`UpdateGlobalConfigSchema` / `CreateJobSchema`) | exact |
| `lib/admin/types.ts` | model | — | itself (`GlobalSettingsConfig` / `ScrapeRunDetail`) | exact |
| `lib/admin/queries.ts` | service | CRUD | itself (`getGlobalSettingsConfig`) | exact |
| `app/api/admin/config/route.ts` | route / controller | request-response | itself (PATCH + zod) | exact |
| `app/api/admin/jobs/route.ts` | route / controller | request-response | itself (POST CreateJob) | exact |
| `components/admin/SettingsClient.tsx` | component | request-response | itself (Proxy card + cap notice + number inputs) | exact |
| `components/admin/DashboardClient.tsx` | component | request-response | itself (status strip) + Settings `capExceededNotice` | role-match |
| `components/admin/RunDetailClient.tsx` | component | request-response | itself (metric tile grid + status chips) | exact |
| `components/admin/admin-messages.ts` | config / i18n | — | itself (`settingsMessages` / `runDetailMessages`) | exact |
| `scraper/src/subito/http-extract.test.ts` | test | transform | `scraper/src/subito/extract.test.ts` | exact |
| `scraper/src/subito/early-stop.test.ts` | test | transform | `scraper/src/shared/validate-run.test.ts` | role-match |
| `scraper/src/shared/validate-run.test.ts` | test | transform | itself | exact |
| `docs/adr/015-scraper-http-stack.md` / `015-production-proxy.md` | docs | — | `docs/legal/subito-scraping-note.md` | partial |
| `.planning/.../15-SPIKE-HTTP-CATEGORY.md` | docs (spike artifact) | file-I/O | spike script → `08-PADOVA-SPIKE.md` write pattern | role-match |

## Pattern Assignments

### `scraper/scripts/spike-subito-http-category.mjs` (utility, request-response + file-I/O)

**Analog:** `scraper/scripts/spike-subito-padova.mjs`

**Imports / script header pattern** (lines 1–18):
```javascript
// D-15 Padova spike gate — verify padova/padova regalo URLs return listings + coords.
//
// Run: node scraper/scripts/spike-subito-padova.mjs
// (from repo root; uses Playwright headless Chromium — no curl-only probes)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/phases/08-.../08-PADOVA-SPIKE.md',
);
```

**Core pattern — `__NEXT_DATA__` parse from HTML** (lines 84–92):
```javascript
function fromNextData(html) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return walkForCoords(JSON.parse(m[1]));
  } catch {
    return null;
  }
}
```

**Cookie dismiss (Playwright arm of spike)** (lines 48–57):
```javascript
async function dismissCookieBanner(page) {
  const accept = page.locator('#didomi-notice-agree-button, button:has-text("Accetta")');
  if ((await accept.count()) > 0) {
    await accept.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}
```

**Copy for Phase 15:** Same repo-root + write-to-`.planning/phases/15-.../15-SPIKE-HTTP-CATEGORY.md` pattern; swap Playwright primary for `HttpCrawler` / `got-scraping`; keep 3 live URLs + pass/fail gates; optional Scrapling venv arm is spike-only.

---

### `scraper/src/subito/http-extract.ts` (service, transform)

**Analog:** `scraper/src/subito/extract.ts`

**Imports + `RawListing` shape** (lines 1–18):
```typescript
import type { Page } from 'playwright';
import { parseRegaloCategoryUrl } from './url-context.js';

export type RawListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  description?: string;
  source_category_url?: string;
};
```

**Core pattern — parse `__NEXT_DATA__` from HTML string** (lines 165–173):
```typescript
function fromNextData(html: string): { lat: number; lng: number } | null {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return walkForCoords(JSON.parse(m[1]));
  } catch {
    return null;
  }
}
```

**Centroid-first coords (D-15-11)** (lines 242–281) — reuse `resolveCoords` / `lookupMunicipalityCentroid`; do not invent new geo:
```typescript
export function resolveCoords(
  html: string,
  municipalityText: string,
  externalUrl = '',
  sourceCategoryUrl = '',
): ResolveCoordsResult {
  // embedded next-data / ld-json / raw-html / map-url, then centroid
}
```

**Cookie wall helper for Playwright fallback** (lines 283–288):
```typescript
async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.locator('#didomi-notice-agree-button, button:has-text("Accetta")');
  // ...
}
```

**Copy for Phase 15:** New `http-extract.ts` should export HTML-string → `RawListing[]` (category cards). Reuse `RawListing`, `isRegaloCategoryUrl`, `resolveCoords`. Stop using `extractListingsFromPage` N+1 loop as primary (lines 419+); keep detail extract behind fallback.

---

### `scraper/src/subito/crawl-hash.ts` (utility, transform)

**Analog:** `scraper/src/shared/dedupe.ts`

**Core pattern** (lines 1–6):
```typescript
import { createHash } from 'node:crypto';
import type { CanonicalListing } from './schema.js';

export function contentHash(listing: Omit<CanonicalListing, 'content_hash'>): string {
  const payload = `${listing.title}|${listing.photo_url}|${listing.lat}|${listing.lng}`;
  return createHash('sha256').update(payload).digest('hex');
}
```

**Copy for Phase 15:** Mirror style for `crawlContentHash({ title, price, images, posted_at })` — separate function/column. **Do not change** persist `contentHash` formula (would churn translations).

---

### `scraper/src/subito/known-set.ts` (service, CRUD read)

**Analog:** `scraper/src/shared/persist.ts` (select by source+external_id) + `config-loader.ts` (Supabase client query style)

**Select pattern from persist** (lines 47–56):
```typescript
const { data: existing, error: selectError } = await supabase
  .from('listings')
  .select('id, content_hash')
  .eq('source', listing.source)
  .eq('external_id', listing.external_id)
  .maybeSingle();

if (selectError) {
  throw selectError;
}
```

**Parallel config load style** (`config-loader.ts` lines 65–68):
```typescript
const [sourceResult, globalResult] = await Promise.all([
  supabase.from('scraper_sources').select('*').eq('slug', slug).maybeSingle(),
  supabase.from('scraper_global_config').select('*').eq('id', 1).maybeSingle(),
]);
```

**Copy for Phase 15:** One query per run: `listings` where `source = 'subito'` select `external_id, crawl_content_hash` → `Map<string, string>`. Throw on Supabase error like persist/config-loader.

---

### `scraper/src/subito/crawler.ts` (service, batch)

**Analog:** itself — extend in place

**Imports + ProxyConfiguration + PlaywrightCrawler** (lines 1–55):
```typescript
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import { getProxyUrl } from '../config.js';
import { extractListingsFromPage, isRegaloCategoryUrl, type RawListing } from './extract.js';

export async function runSubitoCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
): Promise<CrawlResult> {
  const crawleeOpts = presetToCrawleeOptions(preset);
  const proxyUrl = proxyUrlOverride ?? getProxyUrl();
  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { maxPoolSize: crawleeOpts.maxPoolSize },
    maxRequestRetries: crawleeOpts.maxRequestRetries,
    minConcurrency: crawleeOpts.minConcurrency,
    // requestHandler → extractListingsFromPage
  });
}
```

**Preset concurrency source** (`scraper/src/admin/presets.ts` lines 8–16):
```typescript
const PRESET_MAP: Record<AntiBlockPreset, CrawleePresetOptions> = {
  conservative: { maxPoolSize: 2, maxRequestRetries: 2, minConcurrency: 1 },
  standard: { maxPoolSize: 5, maxRequestRetries: 3, minConcurrency: 1 },
  aggressive: { maxPoolSize: 8, maxRequestRetries: 5, minConcurrency: 2 },
};
```

**Copy for Phase 15:** Add `HttpCrawler` primary with same `ProxyConfiguration` / session pool / `presetToCrawleeOptions` retries. Playwright fallback queue: `minConcurrency: 1` (override aggressive preset concurrency for fallback only — D-15-15). Expand `CrawlResult` with `http_requests`, `listings_skipped_at_crawl`, `json_field_completeness`, `degraded`, `crawl_mode`. Feature-flag branch: `USE_HTTP_CRAWLER=off` keeps current Playwright-only path.

---

### `scraper/src/shared/persist.ts` (service, CRUD)

**Analog:** itself — hash-unchanged touch (D-15-09)

**Core touch pattern** (lines 58–73):
```typescript
if (existing?.content_hash === listing.content_hash) {
  const now = new Date();
  const { error: touchError } = await supabase
    .from('listings')
    .update({
      status: 'active',
      expires_at: computeExpiresAt(listing.posted_at, now).toISOString(),
      scraped_at: now.toISOString(),
    })
    .eq('id', existing.id);
  return { result: 'skipped', listingId: (existing.id as string) ?? null };
}
```

**Copy for Phase 15:** Keep touch path for full-refresh hash-unchanged. Also write `crawl_content_hash` on insert/update. Never double-count crawl-skip vs persist-skip metrics.

---

### `scraper/src/shared/validate-run.ts` (utility, transform)

**Analog:** itself

**Core gate** (lines 1–42):
```typescript
export function validateBatch(
  listings: unknown[],
  trailingMedians: number[],
  selectorHitRate: number,
  minCountRatio = 0.5,
  minSelectorRate = 0.9,
  geoResolutionRate?: number,
  minGeoResolutionRate?: number,
): { ok: true } | { ok: false; reason: string } {
  // count vs median * ratio; selectorHitRate; optional geo
}
```

**Copy for Phase 15:** Add HTTP-path variant (or optional args) for `jsonFieldCompleteness` + mode-aware `minCountRatio` (full ~0.5, incremental ~0.2; allow pass when `crawlSkipped > 0` + completeness OK). Keep `selectorHitRate` for legacy path.

**Test analog:** `validate-run.test.ts` — vitest `describe`/`it`, assert `result.ok` + `reason` regex.

---

### `scraper/src/config-loader.ts` (service, CRUD)

**Analog:** itself

**Proxy soft-fail decrypt** (lines 31–50):
```typescript
function resolveProxyUrl(proxyEnc: EncryptedProxyPayload | null | undefined): string | undefined {
  // decrypt or fall back to PROXY_URL; warn on decrypt failure — never hard-fail
}
```

**Copy for Phase 15:** Extend `SourceConfig` (or parallel crawl settings type) with `earlyStopK`, `fullRefreshHours`, `maxPages`, `lastFullRefreshAt` from typed `scraper_global_config` columns. Soft proxy gate (D-15-17/18) lives in worker: warn when unset; production → `degraded` without blocking startup.

---

### `scraper/src/worker.ts` (service, batch)

**Analog:** itself

**Finish metrics write** (lines 32–41, 95–113):
```typescript
type FinishScrapeRunParams = {
  status: 'success' | 'failed' | 'partial';
  listingsFound: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  rejected?: number;
  failureReason?: string;
  selectorHitRate: number;
};

await supabase.from('scrape_runs').update({
  finished_at: new Date().toISOString(),
  status: params.status,
  listings_found: params.listingsFound,
  // ... skipped, selector_hit_rate
}).eq('id', runId);
```

**Orchestration + validation + notify** (lines 203–272): load config → `runSubitoCrawler` → `validateBatch` → fail + `notifyOperator` OR `persistBatch` → `finishScrapeRun` → `updateScrapeJob`.

**Job options** (lines 22–25):
```typescript
type ScrapeRunOptions = {
  trigger?: 'cron' | 'manual';
  jobId?: string;
};
```

**Copy for Phase 15:** Extend `FinishScrapeRunParams` + update payload with `listings_skipped_at_crawl`, `http_requests`, `wall_time_seconds`, `crawl_mode`, `degraded`, `json_field_completeness`. Pass `crawl_mode` from job row / refresh timer. Soft proxy degraded flag before crawl. Feature flag `USE_HTTP_CRAWLER`. Alert on validation fail or `>50%` URLs blocked (reuse `notifyOperator` email path — `scraper/src/alert/notify.ts`).

---

### `supabase/migrations/023_phase15_crawl_metrics.sql` (migration)

**Analog:** `supabase/migrations/020_subito_location_category.sql` (alter + index) + `018_scraper_admin.sql` (typed columns on `scraper_global_config` / `scrape_jobs`)

**Alter + index pattern** (`020` lines 4–10):
```sql
alter table public.listings
  add column if not exists city text,
  add column if not exists region text;

create index if not exists listings_city_idx
  on public.listings (city)
  where status = 'active';
```

**Typed singleton config** (`018` lines 47–60):
```sql
create table public.scraper_global_config (
  id int primary key default 1 check (id = 1),
  global_pause boolean not null default false,
  -- ... typed columns, not freeform JSON blob
  proxy_enc jsonb,
  updated_at timestamptz not null default now()
);
```

**scrape_jobs shape** (`018` lines 99–109):
```sql
create table public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null references public.scraper_sources(slug),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  -- ...
);
```

**Copy for Phase 15:** Prefer **typed columns** (RESEARCH note on D-15-27) for `early_stop_k`, `full_refresh_hours`, `max_pages`, `last_full_refresh_at`, `last_block_reason`, `degraded_run_count`; add `scrape_jobs.crawl_mode`; add `listings.crawl_content_hash` + covering index; extend `scrape_runs` metrics. Number migration after latest (`022` → `023`).

---

### `lib/admin/schemas.ts` + `app/api/admin/jobs/route.ts` + `app/api/admin/config/route.ts`

**Analog:** themselves

**Zod schemas** (`schemas.ts` lines 18–30):
```typescript
export const UpdateGlobalConfigSchema = z.object({
  global_pause: z.boolean().optional(),
  // ...
  proxy_url: z.string().url().optional(),
  alert_email: z.union([z.string().email(), z.literal('')]).nullable().optional(),
});

export const CreateJobSchema = z.object({
  source_slug: sourceSlugSchema,
});
```

**Jobs POST auth + insert** (`jobs/route.ts` lines 6–58):
```typescript
export async function POST(request: Request) {
  const session = await requireOperatorSession();
  if ('error' in session) return session.error;
  const parsed = CreateJobSchema.safeParse(body);
  // validate source exists → insert scrape_jobs → 201
}
```

**Config PATCH** (`config/route.ts` lines 84–99): `getOperatorSession` → `UpdateGlobalConfigSchema.safeParse` → `buildUpdatePayload` (encrypt proxy) → update singleton `id=1`.

**Copy for Phase 15:**
- `UpdateGlobalConfigSchema`: add `early_stop_k`, `full_refresh_hours`, `max_pages` with int min/max matching migration checks.
- `CreateJobSchema`: add `crawl_mode: z.enum(['incremental', 'full']).optional().default('incremental')`.
- Jobs route: persist `crawl_mode` on insert.
- Config serialize/select: return new fields + `last_block_reason`, `degraded_run_count` (never decrypt proxy into response — keep `proxy_configured` boolean).

---

### `components/admin/SettingsClient.tsx` (component, request-response)

**Analog:** itself — Stitch admin Settings

**Soft notice banner** (lines 189–193) — template for degraded banner:
```tsx
{capExceeded ? (
  <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-on-surface">
    {settingsMessages.capExceededNotice}
  </p>
) : null}
```

**Proxy card + configured chip** (lines 228–242):
```tsx
<section className="space-y-4 rounded border border-outline-variant bg-surface p-5 lg:col-span-7">
  <div className="flex items-center justify-between border-b border-outline-variant pb-3">
    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
      <span className="material-symbols-outlined text-[20px]" aria-hidden>router</span>
      {settingsMessages.proxyTitle}
    </h2>
    <span className="inline-flex items-center gap-1.5 rounded-full border ...">
      <span className={`h-2 w-2 rounded-full ${proxyConfigured ? 'bg-primary' : 'bg-outline-variant'}`} />
      {proxyConfigured ? settingsMessages.proxyConfigured : settingsMessages.proxyNotConfigured}
    </span>
  </div>
```

**Numeric field + monospace** (lines 336–344):
```tsx
<input
  type="number"
  min={1}
  value={dailyCap}
  onChange={(event) => setDailyCap(Number(event.target.value))}
  className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
/>
```

**Full crawl trigger analog:** `SourceDetailClient.handleRunNow` (lines 136–155) — POST `/api/admin/jobs` with JSON body; disable while busy.

**Copy for Phase 15 (per 15-UI-SPEC):** Insert Crawl efficiency card after Global Pause / before Proxy; three number inputs + primary black **Run full crawl**; extend Proxy with last-block + degraded-count rows; degraded banner uses soft notice classes (not `bg-error-container`); save via existing sticky PATCH footer.

---

### `components/admin/DashboardClient.tsx` (component)

**Analog:** itself status strip (lines 114–137) + Settings soft notice

**Status strip host:**
```tsx
<section className="mb-space-xl flex flex-wrap items-center justify-between gap-4 rounded border border-outline-variant bg-surface p-space-md">
  {/* global pause + last sync */}
</section>
```

**Copy for Phase 15:** Place non-dismissible `DegradedBanner` near this strip; optional link to `/admin/settings`. Reuse Material Symbol `warning` + secondary text (UI-SPEC).

---

### `components/admin/RunDetailClient.tsx` (component)

**Analog:** itself

**Status chip + metric grid** (lines 75–122):
```tsx
<span className={cn(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-medium',
  statusChipClass(run),
)}>
  {runStatusLabel(run)}
</span>

<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
  {[
    { label: runDetailMessages.metricFound, value: run.listingsFound },
    // ...
  ].map((metric) => (
    <div key={metric.label} className="space-y-1 rounded border border-outline-variant bg-surface p-4">
      <p className="text-[13px] font-medium uppercase tracking-wide text-secondary">{metric.label}</p>
      <p className="font-mono text-[24px] font-bold">{metric.value}</p>
    </div>
  ))}
</div>
```

**Copy for Phase 15:** Extend metric array with crawl skipped / HTTP requests / wall time; add Incremental|Full + optional Degraded chips beside status. Missing new columns → `0` / `—` (UI-SPEC). Update `lib/admin/types.ts` `ScrapeRunDetail` accordingly.

---

### Free-filter / price ambiguity (fallback routing)

**Analog:** `scraper/src/shared/free-filter.ts` (lines 1–19)

```typescript
const PRICE_PATTERNS = [
  /€\s*\d+/i,
  /\beuro\b/i,
  /\bprezzo\b/i,
  /\bvend/i,
  // ...
];

export function isMislabeledFree(title: string, description?: string): string | null {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(text)) return `matched price pattern: ${pattern.source}`;
  }
  return null;
}
```

**Copy for Phase 15:** Extend title-keyword scan for paid signals (D-15-12); do not replace `isMislabeledFree`.

---

### Tests

| New test | Analog | Pattern |
|----------|--------|---------|
| `http-extract.test.ts` | `extract.test.ts` | vitest; fixture JSON → assert fields; no network |
| `early-stop.test.ts` | `validate-run.test.ts` | pure function unit; consecutive known → break |
| `validate-run.test.ts` extend | itself | add JSON completeness + incremental ratio cases |
| `schemas.test.ts` | existing schema tests | `CreateJobSchema` / global config field bounds |

**Fixture placement:** phase dir `fixtures/next-data-*.json` or `scraper/fixtures/` — load via `readFileSync` like centroids in `extract.ts`.

---

### ADRs (`docs/adr/015-*.md`)

**Analog (partial):** `docs/legal/subito-scraping-note.md` — only docs precedent under `docs/`. No existing ADR folder.

**Copy for Phase 15:** Create `docs/adr/` anew. Proxy ADR must cite residential Italian proxy requirement (same legal note D-22). Stack ADR: Crawlee HttpCrawler default; Apify escape hatch only; Scrapling rejected unless spike wins.

## Shared Patterns

### Operator auth on admin APIs
**Source:** `app/api/admin/jobs/route.ts` (`requireOperatorSession`) / `app/api/admin/config/route.ts` (`getOperatorSession`)
**Apply to:** All config/jobs PATCH/POST extensions
```typescript
const session = await requireOperatorSession();
if ('error' in session) return session.error;
const parsed = CreateJobSchema.safeParse(body);
```

### Proxy encryption — never log plaintext
**Source:** `app/api/admin/config/route.ts` `buildUpdatePayload` + `config-loader.ts` `resolveProxyUrl`
**Apply to:** Config save + worker soft gate
```typescript
update.proxy_enc = encryptProxy(proxy_url, secretsKey);
// responses: proxy_configured boolean only
```

### Crawlee proxy + session pool
**Source:** `scraper/src/subito/crawler.ts` lines 21–34
**Apply to:** HttpCrawler primary and Playwright fallback
```typescript
const proxyConfiguration = proxyUrl
  ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
  : undefined;
// useSessionPool: true, persistCookiesPerSession: true
```

### Validation fail → finish run + email operator
**Source:** `scraper/src/worker.ts` lines 236–260
**Apply to:** HTTP-path validation failures and >50% URL block alerts
```typescript
await finishScrapeRun(...);
await notifyOperator(supabase, { runId, failureCode, failureDetail, ... });
```

### Stitch admin UI tokens
**Source:** `SettingsClient.tsx` / `RunDetailClient.tsx` + `.planning/google-stitch-ui-design/DESIGN.md`
**Apply to:** Crawl efficiency card, proxy health rows, degraded banner, run metrics
- `border-outline-variant`, `bg-surface`, `rounded` (not rounded-xl/2xl), no drop shadows
- Material Symbols Outlined; Inter; primary black CTAs only
- Soft notices: `bg-surface-container-low` — not `error-container`

### Vitest unit style (scraper)
**Source:** `validate-run.test.ts` / `extract.test.ts`
**Apply to:** All new scraper unit tests — no live network in CI (D-15-33)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/adr/` directory conventions | docs | — | No prior ADR files; invent structure from legal note + RESEARCH ADR content. Closest prose precedent: `docs/legal/subito-scraping-note.md` |

Optional UI extracts (`CrawlEfficiencyCard`, `DegradedBanner`) have exact visual analogs inline in Settings/Dashboard — prefer inline first; extract only if SettingsClient size warrants.

## Metadata

**Analog search scope:** `scraper/src/**`, `scraper/scripts/**`, `components/admin/**`, `lib/admin/**`, `app/api/admin/**`, `supabase/migrations/**`, `docs/**`
**Files scanned:** ~90 relevant sources
**Pattern extraction date:** 2026-08-11
**Strong analogs used (stop at 5+):** crawler.ts, extract.ts, persist.ts/dedupe.ts, worker.ts, SettingsClient/RunDetailClient, schemas+jobs route, migrations 018/020, spike-subito-padova.mjs
