# Phase 15: Scraper Incremental Crawl & Search Efficiency - Research

**Researched:** 2026-08-11
**Domain:** Subito.it HTTP-first category crawl, Crawlee HttpCrawler + Playwright fallback, incremental early-stop, proxy ADR, admin crawl metrics
**Confidence:** HIGH (codebase + locked CONTEXT); MEDIUM (Crawlee/got-scraping docs); LOW (live `__NEXT_DATA__` field map — Wave 0 spike must prove)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Wave 0 Spike (stack lock gate)
- **D-15-01:** Run Wave 0 spike on **3 live URLs** (Venezia + Padova + one high-volume category) before locking stack ADR.
- **D-15-02:** Spike pass criteria: extract title, price, images, posted_at, external_id from JSON on all 3 URLs; ≤2s per URL HTTP; TLS fingerprint test (got-scraping) — proxy optional for spike. — **Reversibility:** costly — spike artifact and pass/fail gates Phase 15 plan waves.
- **D-15-03:** **Crawlee HttpCrawler wins by default** unless Scrapling HTTP wins on **both** block resistance and speed on all 3 URLs. Include TLS test in spike. Scrapling/Apify full migration rejected unless spike proves otherwise.
- **D-15-04:** Apify explicitly **rejected for Phase 15** implementation; mention as future escape hatch in stack ADR only.

#### Incremental early-stop
- **D-15-05:** Early-stop **K=5** consecutive known-unchanged listings; scope is **per category URL**.
- **D-15-06:** "Known unchanged" = **external_id exists AND crawl-layer content_hash matches** (two-tier hash — see D-15-25).
- **D-15-07:** Load full known listing set (**external_id + crawl hash**) **once per run** via single DB query.
- **D-15-08:** Full refresh: **operator-configurable in admin** (default **24h**); disables early-stop for one run. Manual **"full crawl"** button in admin triggers same behavior.
- **D-15-09:** On full refresh: crawl all pages (within max_pages); hash-unchanged listings skip detail visit but **touch scraped_at/expires_at at persist**.
- **D-15-10:** Mid-page insert risk below K threshold is **acceptable** at 90min cadence; full refresh catches drift.

#### Playwright fallback
- **D-15-11:** Coords: **municipality centroid from JSON first**; Playwright detail visit only if still null after centroid resolution (existing `extract.ts` pattern).
- **D-15-12:** Free-filter without description: trust **regalo category URL + JSON price field**; detail fallback if price ambiguous/missing; **title keyword scan** for paid signals (vendesi, €, prezzo).
- **D-15-13:** HTTP block (403, cookie wall, empty JSON): **one Playwright retry per URL**, then mark URL failed.
- **D-15-14:** Cookie wall: Playwright session accepts cookies; **export cookies to HTTP** for subsequent requests in same run where Crawlee supports it.
- **D-15-15:** Fallback queue: **concurrency 1**, separate Playwright queue; use existing anti-block preset for retries.
- **D-15-16:** Detail visit cap: **10% of listings per run** with overflow logged and deferred to next run (protects first-run / empty-DB cost).

#### Production proxy
- **D-15-17:** Dev/local: proxy **optional**; log **warning** when unset (not startup failure).
- **D-15-18:** Production: **soft gate** — worker runs on full 34-URL matrix without proxy but marks run **degraded** + admin banner; not a hard startup block.
- **D-15-19:** Rotation: **single proxy URL** (current `proxy_enc`); rely on **provider-side rotation**; multi-URL `proxyUrls` array deferred unless spike shows IP-only blocks.
- **D-15-20:** ADR documents **Italian residential proxy required** for sustained production full matrix; **operator chooses provider** (Bright Data, Oxylabs, etc.).
- **D-15-21:** **Dedicated admin section** for proxy: configured/not, last block reason, degraded run count (extends beyond minimal banner).
- **D-15-22:** HttpCrawler uses **got-scraping** (TLS fingerprint); validated in Wave 0 spike.

#### Pagination
- **D-15-23:** **Page 1 ships first**; button-click pagination added only if spike + early-stop coverage proves insufficient.
- **D-15-24:** If pagination ships: **max 3 pages per URL** (admin-tunable); early-stop **per page per URL**; pagination attempts **on full-refresh runs only** — incremental runs stay page 1.

#### Validation, schema, rollout, alerts
- **D-15-25:** **Two-tier content_hash**: crawl hash (JSON fields: title, price, images, posted_at) drives early-stop; full hash at persist after enrichment (includes description, coords).
- **D-15-26:** Replace **selectorHitRate** validation gate with **JSON field completeness rate**; document threshold in ADR. Lower minimum listing count on **incremental runs**; full threshold on **full-refresh runs**.
- **D-15-27:** Schema migration (Wave 1): `scrape_runs` columns — `listings_skipped_at_crawl`, `http_requests`, `wall_time_seconds`, `crawl_mode` (incremental|full), `degraded`; extend `scraper_global_config` JSON for K, refresh hours, max pages.
- **D-15-28:** Rollout: **`USE_HTTP_CRAWLER` feature flag**; 3-run shadow compare (log diff HTTP vs legacy path) then **auto-cutover**.
- **D-15-29:** Performance target: **≥10× fewer HTTP requests** vs baseline (~1,050 → ≤120); wall time **≤8 min** for 34-URL matrix on happy path.
- **D-15-30:** Metrics: **scrape_runs columns + per-URL breakdown in structured logs** (crawl-skipped vs persist-skipped).
- **D-15-31:** Alerts: degraded flag on scrape_runs; **email operator only** on validation fail or **>50% URLs blocked** (no new Telegram in Phase 15).

#### Admin config surface
- **D-15-32:** Admin scraper config page adds **4 fields**: `early_stop_k`, `full_refresh_hours`, `max_pages`, manual **full crawl** trigger; keep existing anti-block preset selector.

#### Testing
- **D-15-33:** **Unit tests with captured `__NEXT_DATA__` fixtures** (no network); spike script for live validation; live URL integration test **manual / env-gated only** (not CI on every PR).

### Claude's Discretion
- Full refresh hash-unchanged behavior (touch expires_at without detail)
- Spike pass criteria fine-tuning (exact TLS test procedure)
- Crawlee vs Scrapling winner tie-break details
- Validation threshold numeric values (document in ADR during planning)
- Feature flag shadow compare logging format

### Deferred Ideas (OUT OF SCOPE)
- **Apify hosted actor** — future escape hatch if self-hosted blocks persist post-deploy
- **Scrapling Python full rewrite** — only if Wave 0 spike shows Crawlee HTTP fails on all 3 URLs and Scrapling wins block+speed
- **Multi-URL proxy rotation UI** — defer unless spike shows IP-only blocks with provider-side rotation insufficient
- **Telegram operator alerts** — defer to Phase 7 (planned in INTEGRATIONS.md)
- **CI live URL tests on every PR** — rejected; env-gated manual only
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRP-E01 | Category-page primary extract path parses embedded JSON (`__NEXT_DATA__` or equivalent) — not N+1 detail page visits | Extend `extract.ts` with HTML-string parser; HttpCrawler `body` → parse `__NEXT_DATA__`; Wave 0 proves field map |
| SCRP-E02 | Incremental crawl loads known `external_id` set; skips unchanged at crawl layer; early-stops after K consecutive known (default K=5) | `listings.crawl_content_hash` + once-per-run Map; early-stop loop per category URL |
| SCRP-E03 | Periodic full refresh (default 24h) disables early-stop; re-touch visible listings | `full_refresh_hours` + `last_full_refresh_at` / job `mode=full`; persist touch path already exists |
| SCRP-E04 | Playwright only for fallback (coords/description), pagination clicks, or HTTP-block retry | Split crawlers: HttpCrawler primary + concurrency-1 Playwright queue; 10% detail cap |
| SCRP-E05 | Proxy ADR — dev optional; production residential; admin configured/not | Soft gate + Settings proxy health section per 15-UI-SPEC; legal note D-22 |
| SCRP-E06 | Tech stack ADR — keep Crawlee + Node; HttpCrawler primary + Playwright secondary | Wave 0 spike gate; default Crawlee win; no Apify/Python rewrite |
| SCRP-E07 | Metrics distinguish crawl-layer vs persist-layer skips; request count + wall time | New `scrape_runs` columns + structured per-URL logs |
| SCRP-E08 | Batch validation still protects empty/broken feeds; thresholds updated with rationale | Replace `selectorHitRate` with JSON completeness; mode-aware min count |
</phase_requirements>

## Summary

Phase 15 replaces the current **N+1 Playwright detail loop** in `scraper/src/subito/extract.ts` (`resolveDetailUrls` → `page.goto` per listing) with an **HTTP-first category JSON path** using Crawlee `HttpCrawler` (got-scraping TLS under the hood). Incremental early-stop (K=5 consecutive known-unchanged per category URL) plus a 24h/full-crawl refresh mode cut request volume from ~1,050 toward ≤120 on the 34-URL Venice+Padova matrix. Playwright remains only for cookie-wall/block retry, selective detail enrichment (coords/description/price ambiguity), and optional button pagination on full refresh.

The existing stack already owns the right seams: `runSubitoCrawler` + presets + `ProxyConfiguration`, `persistListing` hash-skip/touch, `validateBatch`, admin Settings proxy chip, and `scrape_jobs` “Run now.” Research recommends **no new production npm packages** — use `HttpCrawler` from installed `crawlee@3.17` (transitive `got-scraping@4.2.1`). Wave 0 must lock the live `__NEXT_DATA__` field map before implementation waves; SPIKE-NOTES prove coords are usually absent from JSON and centroid fallback is required.

**Primary recommendation:** Gate all implementation waves on a Wave 0 spike artifact that proves category JSON extraction on 3 live URLs; then implement HttpCrawler primary + crawl-hash early-stop + schema/metrics + admin UI (Stitch-aligned) behind `USE_HTTP_CRAWLER`, keeping Playwright as a capped fallback queue.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Category HTTP fetch + JSON extract | API / Backend (scraper worker) | — | Worker-only; never browser/Next |
| Incremental early-stop + known-set load | API / Backend + Database | — | Single Supabase query → in-memory Map |
| Playwright fallback / cookie accept | API / Backend (worker) | — | Headless Chromium in worker process |
| Persist + content_hash touch | Database / Storage via worker | — | Existing `persist.ts` |
| Batch validation gate | API / Backend | — | `validate-run.ts` before writes |
| Proxy config + crawl settings UI | Frontend Server (Next admin) | Browser / Client | `/admin` SettingsClient + APIs |
| Soft degraded banner | Browser / Client (admin) | API (run flag) | Reads `scrape_runs.degraded` / proxy status |
| Run metrics display | Frontend Server + Browser | Database | Extend RunDetailClient queries |
| Feature flag / shadow compare | API / Backend | — | Env `USE_HTTP_CRAWLER` |
| ADRs (proxy + stack) | Docs (repo) | — | Phase dir ADRs |

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/stitch-ui-design.mdc` (admin UI only for this phase):

1. Before writing/editing UI: read `.planning/google-stitch-ui-design/DESIGN.md`, matching screen prototype, existing React in `components/admin/`, and `@theme` tokens — port, do not redesign.
2. Monochrome document-first; thin `#e5e5e5` borders; no card drop shadows.
3. Inter typography; Material Symbols Outlined; 4px spacing grid; primary CTA black on white; chips `#f1f1f0`.
4. shadcn/Radix OK only when restyled to Stitch tokens (D-53).
5. Blocking anti-patterns: default shadcn theme, rounded-xl/2xl cards, saturated accents, glassmorphism, hardcoded hex drift, new visual language when Stitch/admin prototypes exist.

Phase 15 admin surfaces are contracted in `15-UI-SPEC.md` (Settings crawl card, proxy health, degraded banner, run metric chips). Consumer feed is out of scope.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `crawlee` | **3.17.0** installed (`^3.12.0` in package.json); registry latest **3.18.0** | `HttpCrawler` primary + existing `PlaywrightCrawler` fallback | Already in worker; HttpCrawler exported; session/proxy APIs match current crawler [VERIFIED: npm registry + local `npm ls`] |
| `got-scraping` | **4.2.1** (transitive via crawlee) | Browser-like TLS/header fingerprint for HTTP path | HttpCrawler transport; D-15-22 [VERIFIED: npm registry + local node_modules] |
| `playwright` | **^1.62.0** (installed 1.62.x) | Cookie wall, HTTP-block retry, capped detail visits, optional pagination clicks | Already used by `runSubitoCrawler` [VERIFIED: scraper/package.json] |
| `@supabase/supabase-js` | **^2.49.0** | Known-set query, scrape_runs metrics, config | Existing worker data layer [VERIFIED: scraper/package.json] |
| `zod` | **^3.24.0** | Admin config + job schema validation | Existing admin schemas [VERIFIED: scraper/package.json + lib/admin/schemas.ts] |
| `vitest` | **^3.0.0** (dev) | Fixture unit tests | Existing scraper test runner — 95 tests green [VERIFIED: local `npm test`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Scrapling (Python) | spike-only | TLS/speed comparison vs Crawlee HTTP | Wave 0 only; do **not** add to production worker [ASSUMED: docs.scrapling; pip install in spike venv] |
| Node `crypto.createHash('sha256')` | stdlib | crawl + persist hashes | Match `dedupe.ts` pattern [VERIFIED: scraper/src/shared/dedupe.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Crawlee HttpCrawler | Scrapling `Fetcher` (curl_cffi) | Better TLS impersonation possible, but Python rewrite of entire worker — rejected unless spike wins **both** block+speed on all 3 URLs (D-15-03) |
| Crawlee HttpCrawler | Raw `got-scraping` without Crawlee | Lose session pool, retries, proxy integration already wired |
| Self-hosted Crawlee | Apify Actors | Explicitly rejected for Phase 15 (D-15-04); ADR escape hatch only |
| `?o=` pagination | Button pagination | `?o=` disallowed by robots.txt / SPIKE-NOTES; button pagination full-refresh only (D-15-23/24) |

**Installation:**

```bash
# Production worker — no new packages required (HttpCrawler already in crawlee)
# Optional: pin got-scraping as direct dep for spike scripts / clearer imports
cd scraper && npm install got-scraping@^4.2.1

# Wave 0 Scrapling comparison only (isolated venv — never merge into worker deps)
python3 -m venv /tmp/scrapling-spike && /tmp/scrapling-spike/bin/pip install scrapling
```

**Version verification (2026-08-11):**
- `crawlee@3.18.0` latest on npm; project resolves **3.17.0** — stay on installed range unless spike needs a fix
- `got-scraping@4.2.1` — OK legitimacy, no postinstall
- `playwright@1.62.1` latest path — already installed

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| crawlee | npm | since 2022 (latest publish flagged “too-new”) | ~151k/wk | github.com/apify/crawlee | [SUS] too-new | **Approved keep** — already production dep; SUS is latest-version timestamp false positive |
| got-scraping | npm | established | ~261k/wk | github.com/apify/got-scraping | [OK] | Approved — transitive; optional direct pin |
| playwright | npm | established | ~80M/wk | github.com/microsoft/playwright | [SUS] too-new | **Approved keep** — already production dep |
| zod | npm | established | ~254M/wk | github.com/colinhacks/zod | [OK] | Approved |
| vitest | npm | established | ~90M/wk | github.com/vitest-dev/vitest | [OK] | Approved |
| scrapling | PyPI | spike only | n/a | scrapling docs | [ASSUMED] | Spike venv only — not a worker dependency |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** crawlee, playwright — already installed; no new install checkpoint required. If planner adds a **new** direct dep beyond got-scraping pin, re-run legitimacy gate.

*Scrapling discovered via discussion/docs — `[ASSUMED]` for production; spike-only OK without worker install.*

## Architecture Patterns

### System Architecture Diagram

```text
                    ┌─────────────────────────────┐
                    │ Admin Settings / Jobs API   │
                    │ early_stop_k, refresh_h,    │
                    │ max_pages, Full crawl, proxy│
                    └──────────────┬──────────────┘
                                   │ enqueue scrape_jobs
                                   │ (mode=incremental|full)
                                   ▼
┌──────────────┐   tick/cron    ┌──────────────────────────────────┐
│ scheduler.ts │ ─────────────► │ worker.runSourceScrape           │
└──────────────┘                │ 1. loadSourceConfig + crawl cfg  │
                                │ 2. loadKnownSet (id→crawl_hash)  │
                                │ 3. decide crawl_mode             │
                                └──────────────┬───────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
           ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
           │ HttpCrawler     │      │ Early-stop logic │      │ Playwright queue│
           │ got-scraping    │─────►│ per category URL │      │ concurrency 1   │
           │ category pages  │      │ K consecutive    │      │ block retry /   │
           └────────┬────────┘      │ known-unchanged  │      │ detail enrich   │
                    │               └────────┬─────────┘      └────────┬────────┘
                    │ parse __NEXT_DATA__     │ crawl-skip             │ ≤10% listings
                    ▼                        ▼                         ▼
           ┌────────────────────────────────────────────────────────────────┐
           │ RawListing[] + metrics (http_requests, crawl_skipped, wall)    │
           └────────────────────────────┬───────────────────────────────────┘
                                        ▼
           ┌─────────────────┐    fail     ┌──────────────────────────────┐
           │ validateBatch   │────────────►│ finish failed + email alert  │
           │ JSON completeness│            │ (or >50% URLs blocked)       │
           └────────┬────────┘            └──────────────────────────────┘
                    │ ok
                    ▼
           ┌─────────────────┐            ┌──────────────────────────────┐
           │ persistBatch    │───────────►│ scrape_runs metrics + logs   │
           │ persist-skip /  │            │ crawl_mode, degraded, counts │
           │ touch expires   │            └──────────────────────────────┘
           └─────────────────┘
```

### Recommended Project Structure

```
scraper/
├── scripts/
│   └── spike-subito-http-category.mjs   # Wave 0: HttpCrawler + field map + TLS
├── src/
│   ├── subito/
│   │   ├── crawler.ts                   # orchestrate Http primary + PW fallback
│   │   ├── http-extract.ts              # NEW: parse category HTML/__NEXT_DATA__
│   │   ├── extract.ts                   # keep detail/centroid helpers; stop N+1 loop as primary
│   │   ├── crawl-hash.ts                # NEW: crawlContentHash(title,price,images,posted_at)
│   │   └── known-set.ts                 # NEW: loadKnownListingSet(supabase)
│   ├── shared/
│   │   ├── persist.ts                   # unchanged touch path; write crawl_content_hash
│   │   ├── dedupe.ts                    # persist contentHash (keep formula)
│   │   └── validate-run.ts              # JSON completeness + mode-aware min count
│   ├── config-loader.ts                 # load early_stop_k, refresh hours, max_pages
│   └── worker.ts                        # metrics columns, degraded, feature flag
docs/adr/
│   ├── 015-scraper-http-stack.md        # SCRP-E06
│   └── 015-production-proxy.md          # SCRP-E05
.planning/phases/15-.../
│   ├── 15-SPIKE-HTTP-CATEGORY.md        # Wave 0 artifact (required)
│   └── fixtures/next-data-*.json        # captured fixtures for unit tests
components/admin/
│   └── SettingsClient.tsx               # crawl efficiency + proxy health (UI-SPEC)
supabase/migrations/
│   └── NNN_phase15_crawl_metrics.sql
```

### Pattern 1: HttpCrawler category fetch

**What:** Fetch category HTML once; parse embedded JSON; no per-listing navigation on happy path.
**When to use:** Primary path when `USE_HTTP_CRAWLER` is `on` or `shadow`.
**Example:**

```typescript
// Source: https://crawlee.dev/js/docs/examples/http-crawler
import { HttpCrawler, ProxyConfiguration } from 'crawlee';

const proxyConfiguration = proxyUrl
  ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
  : undefined;

const crawler = new HttpCrawler({
  proxyConfiguration,
  useSessionPool: Boolean(proxyConfiguration),
  persistCookiesPerSession: true,
  maxRequestRetries: crawleeOpts.maxRequestRetries,
  minConcurrency: 1,
  async requestHandler({ request, body, session }) {
    const html = typeof body === 'string' ? body : body.toString();
    if (!html.includes('__NEXT_DATA__')) {
      session?.retire();
      throw new Error('empty_or_blocked_json');
    }
    // parse → RawListing[] → early-stop → push to run accumulator
  },
});

await crawler.run(categoryUrls);
```

[CITED: crawlee.dev/js/docs/examples/http-crawler]

### Pattern 2: Two-tier hash + early-stop

**What:** Crawl hash from category JSON fields; persist hash remains post-enrichment identity.
**When to use:** Every HTTP listing candidate before enqueueing Playwright detail.

```typescript
// Discretion recommendation — align with dedupe.ts style
import { createHash } from 'node:crypto';

export function crawlContentHash(fields: {
  title: string;
  price: string;      // normalized from JSON (e.g. "0" | "gratis" | "12")
  images: string;     // primary image URL or joined ids
  posted_at: string;  // ISO or raw Italian string as stored in hash input
}): string {
  const payload = `${fields.title}|${fields.price}|${fields.images}|${fields.posted_at}`;
  return createHash('sha256').update(payload).digest('hex');
}
```

Early-stop (per category URL, listing order as returned by JSON — newest-first assumed):

```typescript
let consecutiveKnown = 0;
for (const item of listingsInPageOrder) {
  const known = knownMap.get(item.external_id);
  if (known && known === item.crawl_content_hash) {
    consecutiveKnown += 1;
    stats.listings_skipped_at_crawl += 1;
    if (!isFullRefresh && consecutiveKnown >= earlyStopK) break;
    if (isFullRefresh) touchCandidates.push(item); // persist touch only
    continue;
  }
  consecutiveKnown = 0;
  workQueue.push(item);
}
```

**Discretion (full refresh hash-unchanged):** Reuse existing `persistListing` path when persist `content_hash` matches — already touches `scraped_at`/`expires_at` without rewrite [VERIFIED: scraper/src/shared/persist.ts]. For crawl-skip on full refresh, still call persist with normalized listing (or a dedicated touch-by-external_id) so TTL extends without Playwright.

### Pattern 3: Playwright fallback queue + cookie export

**What:** Cap detail visits; on cookie wall, accept once and inject cookies into HttpCrawler session.
**When to use:** 403 / empty JSON / missing coords after centroid / ambiguous price / optional pagination.

```typescript
// Cookie export (D-15-14) — Playwright → Crawlee session
const cookies = await context.cookies('https://www.subito.it');
// Crawlee Session.setCookies(cookies) then continue HttpCrawler requests
// [ASSUMED: Session.setCookies API shape — confirm against Crawlee Session docs in spike]
```

Fallback concurrency **1**; inherit `presetToCrawleeOptions` retries/pool for the Playwright crawler only (D-15-15). Detail cap: `Math.ceil(0.10 * listingsSeenThisRun)`; overflow → structured log `detail_cap_deferred`.

### Pattern 4: Feature flag shadow compare

**What:** `USE_HTTP_CRAWLER=off|shadow|on` (env).
**Discretion logging format:** one JSON line per run:

```json
{"event":"shadow_compare","run_id":"...","http_count":34,"legacy_count":980,"http_listings":120,"legacy_listings":118,"field_diff_sample":[]}
```

After **3 consecutive successful** shadow runs with listing-count delta within tolerance (recommend ±15% and zero critical field regressions), auto-cutover by treating missing env as `on` **or** writing `http_crawler_enabled=true` into global config (prefer env for Phase 15 simplicity — document operator flip to `on`).

### Anti-Patterns to Avoid

- **Keeping N+1 `page.goto` as primary:** defeats SCRP-E01 and ≥10× request target.
- **Early-stop on external_id alone:** misses price/title/image changes — violates D-15-06.
- **Changing persist `contentHash` formula without migration plan:** causes mass “updated” + translation churn; keep `title|photo_url|lat|lng` for persist; add separate `crawl_content_hash` column.
- **Hard-failing worker when proxy unset in production:** soft gate only (D-15-18).
- **CI hitting live Subito:** D-15-33 forbids; fixtures only.
- **Admin UI redesign:** follow 15-UI-SPEC + Stitch scraper-dashboard prototypes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP fetch + TLS fingerprint | Custom undici/fetch wrapper | Crawlee `HttpCrawler` / got-scraping | Session, retries, proxy, headers already solved [CITED: crawlee.dev] |
| Browser automation | Puppeteer from scratch | Existing PlaywrightCrawler + presets | Already integrated |
| Proxy rotation protocol | Multi-URL rotator UI | Single `proxy_enc` + provider rotation | D-15-19 locked |
| Admin crypto for proxy | New encryption | Existing `lib/admin/crypto` decrypt in config-loader | Already wired |
| Free-filter regex | New classifier | `isMislabeledFree` + JSON price field | Extend, don't replace [VERIFIED: free-filter.ts] |
| Centroid geo | Guess lat/lng | `resolveCoords` / `lookupMunicipalityCentroid` | SPIKE: 0 coords in JSON [VERIFIED: SPIKE-NOTES.md] |

**Key insight:** The expensive part is not parsing — it is **Playwright detail navigation**. Category `__NEXT_DATA__` + crawl-layer skip removes that cost; centroid already covers geo for Venice/Padova-scoped URLs.

## Common Pitfalls

### Pitfall 1: `__NEXT_DATA__` shape drift / missing listing array
**What goes wrong:** HTTP 200 with shell HTML, empty items, or renamed keys → false soft-block or zero listings.
**Why it happens:** Next.js payload structure changes; cookie wall returns soft HTML.
**How to avoid:** Wave 0 documents exact JSON path; unit fixtures; treat missing/empty JSON as block → one Playwright retry (D-15-13).
**Warning signs:** `json_field_completeness` collapse; `http_requests` low but `listings_found` 0.

### Pitfall 2: Early-stop assumes newest-first order
**What goes wrong:** If JSON order is not recency-sorted, K=5 stops before reaching new inserts mid-list.
**Why it happens:** Assumed marketplace sort; Subito may change ranking.
**How to avoid:** Spike verifies sort order; accept residual miss until full refresh (D-15-10); full refresh default 24h.
**Warning signs:** Operators report “new item missing until next day.”

### Pitfall 3: First-run / empty DB detail explosion
**What goes wrong:** Empty known-set → every listing wants Playwright enrichment → timeout / ban.
**Why it happens:** Centroid covers coords; description optional for free-filter when price present (D-15-12); but naive “always detail” still fires.
**How to avoid:** Enforce **10% detail cap** (D-15-16); prefer centroid + title price scan; defer overflow.
**Warning signs:** `http_requests` or Playwright navigations ≫ category URL count.

### Pitfall 4: Validation fails on incremental low counts
**What goes wrong:** Early-stop yields few “found” listings → count gate fails vs 7-run median from full Playwright eras.
**Why it happens:** `validateBatch` uses absolute extracted count vs historical median.
**How to avoid:** Mode-aware thresholds (D-15-26): incremental min count ratio lower (recommend **0.15–0.25** of median of *incremental* successes, or absolute floor e.g. ≥1 new/changed OR crawl_skipped>0 with completeness OK); full refresh keeps ~0.5. Document in stack/validation ADR.
**Warning signs:** Cascading `LOW_COUNT` emails after cutover.

### Pitfall 5: Cookie wall breaks got-scraping until Playwright seeds cookies
**What goes wrong:** First HTTP requests empty; Playwright would dismiss Didomi banner.
**How to avoid:** Detect empty JSON/cookie wall → one Playwright accept → export cookies → resume HTTP (D-15-14).
**Warning signs:** High `degraded` / block reasons `cookie_wall`.

### Pitfall 6: Persist vs crawl skip double-counting
**What goes wrong:** Metrics confuse operators; SCRP-E07 fails.
**How to avoid:** `listings_skipped_at_crawl` vs existing `listings_skipped` (persist); never increment both for same listing.
**Warning signs:** Sum of skips > listings_found.

## Code Examples

### Current N+1 bottleneck (replace as primary)

```419:456:scraper/src/subito/extract.ts
export async function extractListingsFromPage(page: Page): Promise<{
  listings: RawListing[];
  hitRate: SelectorHitRate;
}> {
  await dismissCookieBanner(page);
  // ...
  for (const detailUrl of detailUrls) {
    if (page.url() !== detailUrl) {
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // ...
    }
    const { listing, hitRate } = await extractFromDetailPage(page, sourceCategoryUrl);
    // ...
  }
}
```

### Existing crawler seam to extend

```11:62:scraper/src/subito/crawler.ts
export async function runSubitoCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
): Promise<CrawlResult> {
  // Today: PlaywrightCrawler only
  // Phase 15: HttpCrawler primary; PlaywrightCrawler fallback queue
}
```

### Persist touch already implements full-refresh hash-unchanged intent

```58:73:scraper/src/shared/persist.ts
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

### Persist content hash (keep; do not conflate with crawl hash)

```3:6:scraper/src/shared/dedupe.ts
export function contentHash(listing: Omit<CanonicalListing, 'content_hash'>): string {
  const payload = `${listing.title}|${listing.photo_url}|${listing.lat}|${listing.lng}`;
  return createHash('sha256').update(payload).digest('hex');
}
```

### got-scraping TLS options (spike / HttpCrawler defaults)

```typescript
// Source: https://github.com/apify/got-scraping (README / hooks)
await gotScraping({
  url: categoryUrl,
  headerGeneratorOptions: {
    browsers: [{ name: 'chrome' }],
    devices: ['desktop'],
    locales: ['it-IT', 'en-US'],
    operatingSystems: ['windows'],
  },
});
```

[CITED: github.com/apify/got-scraping]

### Recommended schema migration (Wave 1)

```sql
-- listings: crawl-layer hash for early-stop (D-15-06, D-15-25)
alter table public.listings
  add column if not exists crawl_content_hash text;

create index if not exists listings_source_crawl_hash_idx
  on public.listings (source, external_id)
  include (crawl_content_hash);

-- scrape_runs metrics (D-15-27, SCRP-E07)
alter table public.scrape_runs
  add column if not exists listings_skipped_at_crawl int not null default 0,
  add column if not exists http_requests int,
  add column if not exists wall_time_seconds numeric(10,2),
  add column if not exists crawl_mode text check (crawl_mode in ('incremental', 'full')),
  add column if not exists degraded boolean not null default false,
  add column if not exists json_field_completeness numeric(4,3);

-- Prefer typed columns over opaque JSON (matches existing scraper_global_config style)
alter table public.scraper_global_config
  add column if not exists early_stop_k int not null default 5
    check (early_stop_k between 1 and 50),
  add column if not exists full_refresh_hours int not null default 24
    check (full_refresh_hours between 1 and 168),
  add column if not exists max_pages int not null default 1
    check (max_pages between 1 and 3),
  add column if not exists last_full_refresh_at timestamptz,
  add column if not exists last_block_reason text,
  add column if not exists degraded_run_count int not null default 0;

-- Full crawl trigger via jobs (D-15-08, D-15-32)
alter table public.scrape_jobs
  add column if not exists crawl_mode text not null default 'incremental'
    check (crawl_mode in ('incremental', 'full'));
```

**Note on D-15-27 “JSON fields”:** Existing `scraper_global_config` is **column-based**, not a freeform JSON blob. Typed columns are the consistent choice; if planner prefers a single `crawl_settings jsonb`, document why — but typed columns avoid dual-validation paths.

### Full crawl job API extension

Extend `CreateJobSchema`:

```typescript
export const CreateJobSchema = z.object({
  source_slug: sourceSlugSchema,
  crawl_mode: z.enum(['incremental', 'full']).optional().default('incremental'),
});
```

Settings “Run full crawl” → `POST /api/admin/jobs` with `crawl_mode: 'full'`.

### Validation gate evolution

```typescript
// Discretion thresholds — document in ADR
export function validateBatchHttp(opts: {
  listings: unknown[];
  trailingMedians: number[];
  jsonFieldCompleteness: number;
  crawlMode: 'incremental' | 'full';
  crawlSkipped: number;
}): { ok: true } | { ok: false; reason: string } {
  const minCompleteness = 0.9; // same spirit as SCRAPE_MIN_SELECTOR_RATE
  const minCountRatio = opts.crawlMode === 'full' ? 0.5 : 0.2;
  // Incremental: allow pass when crawlSkipped > 0 and completeness OK even if new count is low
  // ...
}
```

Keep `selector_hit_rate` column for legacy runs; write `json_field_completeness` for HTTP path; admin can show the active metric by `crawl_mode` / flag.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright category + N detail visits | HttpCrawler category JSON + selective Playwright | Phase 15 | ≥10× fewer requests |
| Persist-only content_hash skip | Crawl-layer hash skip + early-stop | Phase 15 | Skip before HTTP/detail cost |
| DOM selectorHitRate gate | JSON field completeness | Phase 15 | Matches HTTP extract path |
| Proxy optional silent | Soft degraded + admin health | Phase 15 | Production visibility without hard block |

**Deprecated/outdated:**
- Primary use of `extractListingsFromPage` N+1 loop — retain as legacy path behind `USE_HTTP_CRAWLER=off` during shadow only, then delete or quarantine.
- Treating `selectorHitRate` as the HTTP-path quality signal.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Category `__NEXT_DATA__` contains title, price, images, posted_at, external_id for regalo cards | Spike / SCRP-E01 | Wave 0 fails → must stay Playwright or find alternate JSON path |
| A2 | Listing order in category JSON is newest-first (supports K early-stop) | Early-stop | Missed inserts until full refresh (accepted by D-15-10 if mild) |
| A3 | Crawlee `Session.setCookies` accepts Playwright cookie objects for cross-engine export | Cookie wall | May need got-scraping cookie jar manual injection |
| A4 | Scrapling pip package name/API matches current docs for spike | Wave 0 | Spike script adjusts; no production impact |
| A5 | Soft production detection = `NODE_ENV=production` or `FLY_APP_NAME` / similar env | Proxy soft gate | Wrong env → missing degraded flag |
| A6 | Baseline ~1,050 requests ≈ 34 URLs × ~30 details + category loads | Perf target | Recalibrate target after measuring current run metrics |

**If this table were empty:** N/A — several spike-dependent claims remain.

## Open Questions

1. **Exact `__NEXT_DATA__` path for listing cards**
   - What we know: Detail pages expose `__NEXT_DATA__` but coords are usually 0; category cards historically scraped via DOM `article` [VERIFIED: SPIKE-NOTES.md].
   - What's unclear: Precise key path for items array + price field on category URLs (incl. Venezia `arredamento-casalinghi`).
   - Recommendation: Wave 0 spike artifact is a **hard gate** before Waves 1–N plans execute extract code.

2. **Shadow auto-cutover persistence**
   - What we know: D-15-28 wants 3-run shadow then auto-cutover.
   - What's unclear: Persist cutover in DB vs document operator env flip.
   - Recommendation: Env `USE_HTTP_CRAWLER=shadow` logs compare; after 3 green runs log `AUTO_CUTOVER_READY`; operator sets `on` (safer than silent cutover). If planner wants true auto, write `http_crawler_mode` to global config.

3. **Pagination necessity**
   - What we know: Page 1 ships first (D-15-23); ~30 cards/page historically.
   - What's unclear: Whether early-stop + 90min cadence covers freshness without page 2–3.
   - Recommendation: Ship page 1; add button pagination only if spike/ops show insufficient coverage.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Worker / HttpCrawler | ✓ | v23.10.0 | — |
| npm | Installs | ✓ | 11.4.2 | — |
| crawlee (local) | HttpCrawler | ✓ | 3.17.0 | — |
| got-scraping (local) | TLS HTTP | ✓ | 4.2.1 | — |
| playwright | Fallback | ✓ | 1.62.x | — |
| vitest | Unit tests | ✓ | 3.2.7 | — |
| Python 3 | Scrapling spike only | ✓ | 3.12.3 | Skip Scrapling arm if unused |
| Live Subito network | Wave 0 spike | ? | — | Fixture-only unit work can proceed; spike needs network |
| Residential proxy | Prod soft gate | optional | — | Degraded runs without it |

**Missing dependencies with no fallback:**
- None for coding waves; Wave 0 live spike needs outbound HTTPS to subito.it.

**Missing dependencies with fallback:**
- Production proxy — soft degraded mode (D-15-18).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3 / 3.2.7 |
| Config file | scraper package defaults (vitest run) |
| Quick run command | `cd scraper && npm test` |
| Full suite command | `cd scraper && npm test` (+ admin `lib/admin/*.test.ts` via root if configured) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRP-E01 | Parse fixture `__NEXT_DATA__` → RawListing fields | unit | `cd scraper && npx vitest run src/subito/http-extract.test.ts` | ❌ Wave 0 |
| SCRP-E02 | Early-stop after K consecutive known hashes | unit | `cd scraper && npx vitest run src/subito/early-stop.test.ts` | ❌ Wave 0 |
| SCRP-E03 | Full mode disables early-stop; touch path | unit | early-stop + persist tests | ❌ / ✅ persist touch exists |
| SCRP-E04 | Detail cap + fallback routing | unit | `src/subito/fallback-queue.test.ts` | ❌ Wave 0 |
| SCRP-E05 | Degraded when prod && !proxy | unit | `src/worker-proxy-gate.test.ts` | ❌ Wave 0 |
| SCRP-E06 | Stack ADR + spike artifact | manual/docs | n/a | ❌ Wave 0 spike md |
| SCRP-E07 | Metrics columns mapped | unit | worker finishScrapeRun tests | ❌ Wave 0 |
| SCRP-E08 | JSON completeness validation | unit | extend `validate-run.test.ts` | ✅ partial (`validate-run.ts`) |
| SCRP-E01 live | Live 3-URL spike | manual/env-gated | `node scraper/scripts/spike-subito-http-category.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd scraper && npm test`
- **Per wave merge:** full scraper vitest + relevant admin schema tests
- **Phase gate:** suite green + spike artifact PASS + ADRs present before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `scraper/scripts/spike-subito-http-category.mjs` — live HttpCrawler + optional Scrapling compare + TLS timing
- [ ] `.planning/phases/15-.../15-SPIKE-HTTP-CATEGORY.md` — field map, pass/fail, Venezia arredamento-casalinghi
- [ ] `scraper/src/subito/http-extract.test.ts` + fixtures under phase dir or `scraper/fixtures/`
- [ ] `scraper/src/subito/early-stop.test.ts`
- [ ] Extend `validate-run.test.ts` for JSON completeness + incremental ratio
- [ ] Migration SQL draft for metrics / crawl_content_hash / config columns
- [ ] Extend `CreateJobSchema` tests for `crawl_mode`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (admin APIs) | Existing `requireOperatorSession` |
| V3 Session Management | yes (admin) | Existing operator session |
| V4 Access Control | yes | RLS `is_operator()` on scraper_global_config / jobs |
| V5 Input Validation | yes | zod: early_stop_k, full_refresh_hours, max_pages, crawl_mode, proxy URL |
| V6 Cryptography | yes (proxy_enc) | Existing SCRAPER_SECRETS_KEY decrypt — do not log decrypted proxy |

### Known Threat Patterns for scraper/admin stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Proxy credential leak in logs | Information disclosure | Never log full proxy URL; mask in admin (`••••`) |
| SSRF via proxy URL field | Tampering | Keep existing proxy URL validation (`https?://`); operator-only |
| Inflated scrape job spam | Denial of service | Existing job queue + in-progress guard in worker |
| Malicious `__NEXT_DATA__` prototype pollution | Tampering | Parse with JSON.parse; map known fields only; zod on RawListing |
| Soft-block false success empty feed | Tampering/repudiation | Validation gate before persist (SCRP-E08) |

## Sources

### Primary (HIGH confidence)

- Codebase: `scraper/src/subito/{crawler,extract}.ts`, `shared/{persist,dedupe,validate-run,free-filter}.ts`, `worker.ts`, `config-loader.ts`, `SPIKE-NOTES.md`
- `docs/legal/subito-scraping-note.md` (D-22 residential proxy)
- `15-CONTEXT.md`, `15-UI-SPEC.md`, REQUIREMENTS SCRP-E01–E08, ROADMAP Phase 15
- Local `npm ls` / `npm test` (95 passed) — crawlee 3.17.0, got-scraping 4.2.1

### Secondary (MEDIUM confidence)

- Context7 `/websites/crawlee_dev_js` — HttpCrawler, ProxyConfiguration, session cookies [CITED: crawlee.dev]
- Context7 `/apify/got-scraping` — TLS fingerprint / headerGeneratorOptions [CITED: github.com/apify/got-scraping]
- `npm view` package legitimacy seam (got-scraping OK; crawlee/playwright SUS-too-new on latest publish)

### Tertiary (LOW confidence)

- WebSearch incremental early-stop / duplicate-ID stop patterns
- Scrapling docs/reviews for spike comparison only
- Assumed Playwright→Crawlee cookie object compatibility (A3)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — packages installed and verified locally; HttpCrawler exported
- Architecture: **HIGH** — maps cleanly onto existing worker/admin seams; locked by CONTEXT
- Pitfalls: **MEDIUM** — informed by SPIKE-NOTES + incremental scraping practice; live JSON path unproven until Wave 0
- Live extract field map: **LOW** until spike artifact

**Research date:** 2026-08-11
**Valid until:** 2026-09-10 (30 days) — re-spike if Subito HTML/JSON changes
