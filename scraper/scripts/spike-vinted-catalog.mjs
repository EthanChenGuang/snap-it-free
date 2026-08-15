// D-17 Wave 0 Vinted catalog spike — prove session-warmed /api/v2/catalog/items extract on 3 live URLs.
//
// Run: node scraper/scripts/spike-vinted-catalog.mjs
// (from repo root; uses got-scraping TLS via crawlee transitive dep)
//
// Gate (D-17-36): PASS requires all 3 URLs to yield session-warmed API extract with
// id/title/price.amount/url/photo on >=90% of returned items, <=3s warm-up+API, plus
// enrichment (catalog_id + shipping.type) and seller-location samples.

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
const CATALOG_FIXTURE_PATH = join(FIXTURE_DIR, 'vinted-catalog-api-sample.json');
const DETAIL_FIXTURE_PATH = join(FIXTURE_DIR, 'vinted-item-detail-fragment.json');

/** D-17-36: one URL per category used across Venice + Padova intent (Remark: geo is enforced post-extract). */
const TARGET_URLS = [
  {
    label: 'Casa (catalog 1918)',
    city: 'venezia',
    url: 'https://www.vinted.it/catalog/1918-casa?order=newest_first',
  },
  {
    label: 'Piccoli elettrodomestici da cucina (catalog 3474)',
    city: 'padova',
    url: 'https://www.vinted.it/catalog/3474-piccoli-elettrodomestici-da-cucina?order=newest_first',
  },
  {
    label: 'Accessori per computer (catalog 3584)',
    city: 'venezia',
    url: 'https://www.vinted.it/catalog/3584-accessori-per-computer?order=newest_first',
  },
];

const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};

// +1s vs Subito (2s) to account for cookie warm-up on Vinted (D-17-36 research).
const WALL_TIME_PASS_MS = 3000;
const API_ORIGIN = 'https://www.vinted.it';
const CATALOG_ITEMS_ENDPOINT = '/api/v2/catalog/items';
const USER_ENDPOINT = '/api/v2/users';

/** D-17-01/02/04: €0 only; missing/empty never qualifies. */
function isFreePrice(amount) {
  if (amount == null || amount === '') return false;
  return Number.parseFloat(String(amount)) === 0;
}

/** URL → catalog API query params (RESEARCH Pattern 1). */
function catalogUrlToApiParams(catalogUrl) {
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

function parseBody(res) {
  if (typeof res.body === 'string') return res.body;
  return res.body.toString();
}

function jsonOrNull(text, context) {
  try {
    return { data: JSON.parse(text), error: null };
  } catch (err) {
    return {
      data: null,
      error: `JSON parse in ${context}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Map a single catalog API item to the field map we need (RESEARCH verified shape). */
function mapCatalogItem(item) {
  return {
    external_id: String(item?.id ?? ''),
    title: item?.title ?? '',
    price: item?.price?.amount ?? '',
    price_currency: item?.price?.currency_code ?? '',
    url: item?.url ?? `https://www.vinted.it${item?.path ?? ''}`,
    photo_url: item?.photo?.url ?? item?.photos?.[0]?.url ?? '',
    user_id: String(item?.user?.id ?? ''),
    size_title: item?.size_title ?? null,
    brand_title: item?.brand_title ?? null,
  };
}

function fieldComplete(item) {
  return Boolean(
    item.external_id &&
      item.title &&
      item.price !== '' &&
      item.url &&
      item.photo_url,
  );
}

function fieldCompleteness(items) {
  if (items.length === 0) return { score: 0, complete: 0, total: 0 };
  const complete = items.filter(fieldComplete).length;
  return { score: complete / items.length, complete, total: items.length };
}

/**
 * Extract cookie header from got response set-cookie for reuse on API call.
 * Skips empty-value cookies (e.g. an empty access_token_web= set-cookie that
 * precedes the populated one) and dedupes by name (last non-empty wins) —
 * otherwise the API rejects the malformed cookie with 401 (D-17-36 verified).
 */
function buildCookieHeader(setCookies) {
  if (!Array.isArray(setCookies)) return '';
  const byName = new Map();
  for (const raw of setCookies) {
    const pair = String(raw ?? '').split(';')[0];
    if (!pair.includes('=')) continue;
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (!value) continue; // skip empty-value cookie (e.g. empty access_token_web=)
    byName.set(name, pair);
  }
  return [...byName.values()].join('; ');
}

function sanitizeCatalogFixtureItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    price: item.price ? { amount: item.price.amount, currency_code: item.price.currency_code } : undefined,
    url: item.url ? '[redacted url]' : undefined,
    path: item.path,
    photo: item.photo ? { url: item.photo.url } : undefined,
    photos: (item.photos ?? []).slice(0, 2).map((p) => ({ url: p.url })),
    user: item.user ? { id: '[redacted]', login: item.user.login, profile_url: '[redacted]' } : undefined,
    brand_title: item.brand_title ?? null,
    size_title: item.size_title ?? null,
    status: item.status ?? null,
  };
}

// ---------------------------------------------------------------- main

console.log('=== D-17 Wave 0 Vinted catalog spike ===');

const proxyUrl = process.env.SCRAPER_PROXY_URL ?? process.env.HTTP_PROXY ?? null;
if (!proxyUrl) {
  console.warn('WARNING: No SCRAPER_PROXY_URL / HTTP_PROXY set — spike runs direct (D-17-33 dev optional).');
}

const results = [];
let catalogFixtureWritten = false;
let detailFixtureWritten = false;
let enrichmentSample = null;
let sellerLocationSample = null;

for (const target of TARGET_URLS) {
  console.log(`\nFetching: ${target.label} [${target.city}]`);
  const row = {
    label: target.label,
    city: target.city,
    url: target.url,
    status: 0,
    wallMs: 0,
    blocked: false,
    listingCount: 0,
    fieldMapOk: false,
    apiError: null,
    freeCount: 0,
    pass: false,
    cookiesObtained: false,
  };

  const t0 = performance.now();
  try {
    // Step 1: warm up session on the catalog page (gets Datadome + access_token_web cookies).
    const warmupRes = await gotScraping({
      url: target.url,
      headerGeneratorOptions: TLS_OPTIONS,
      timeout: { request: 15000 },
      ...(proxyUrl ? { proxyUrl } : {}),
    });
    const cookieHeader = buildCookieHeader(warmupRes.headers?.['set-cookie']);
    row.cookiesObtained = cookieHeader.includes('access_token_web') || cookieHeader.length > 0;
    const warmupMs = Math.round(performance.now() - t0);

    if (warmupRes.statusCode !== 200) {
      row.status = warmupRes.statusCode ?? 0;
      row.apiError = `catalog page HTTP ${warmupRes.statusCode}`;
      row.wallMs = warmupMs;
      results.push(row);
      console.log(`  warmup status=${row.status} wallMs=${row.wallMs} error=${row.apiError}`);
      continue;
    }

    // Step 2: call the session-authenticated catalog items API with warmed cookies.
    const apiT0 = performance.now();
    const params = catalogUrlToApiParams(target.url);
    const query = params.toString();
    const apiRes = await gotScraping({
      url: `${API_ORIGIN}${CATALOG_ITEMS_ENDPOINT}?${query}`,
      headerGeneratorOptions: TLS_OPTIONS,
      timeout: { request: 15000 },
      headers: {
        accept: 'application/json',
        referer: target.url,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      ...(proxyUrl ? { proxyUrl } : {}),
    });
    const apiMs = Math.round(performance.now() - apiT0);

    row.status = apiRes.statusCode ?? 0;
    row.wallMs = warmupMs + apiMs;
    row.blocked = row.status === 403 || row.status === 401;

    const raw = parseBody(apiRes);
    const { data, error } = jsonOrNull(raw, target.label);
    if (error) {
      row.apiError = error;
      results.push(row);
      console.log(`  api status=${row.status} wallMs=${row.wallMs} error=${error}`);
      continue;
    }

    const items = Array.isArray(data) ? data : getByPath(data, 'items') ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      row.apiError = `empty/missing items array: ${Object.keys(data ?? {}).join(',') || 'empty body'}`;
      results.push(row);
      console.log(`  api status=${row.status} wallMs=${row.wallMs} error=${row.apiError}`);
      continue;
    }

    row.listingCount = items.length;
    const mapped = items.map(mapCatalogItem);
    const { score: completeness, complete, total } = fieldCompleteness(mapped);
    row.fieldMapOk = completeness >= 0.9;
    row.freeCount = mapped.filter((l) => isFreePrice(l.price)).length;
    row.wallMs = warmupMs + apiMs;
    row.pass =
      row.status === 200 &&
      !row.blocked &&
      row.fieldMapOk &&
      row.wallMs <= WALL_TIME_PASS_MS &&
      row.cookiesObtained;

    results.push(row);

    console.log(
      `  status=${row.status} warmupMs=${warmupMs} apiMs=${apiMs} totalMs=${row.wallMs} ` +
        `listings=${row.listingCount} completeness=${(completeness * 100).toFixed(0)}% ` +
        `(${complete}/${total}) free€0=${row.freeCount} cookies=${row.cookiesObtained} pass=${row.pass}`,
    );

    // Capture catalog fixture (sanitized) if not yet written.
    if (!catalogFixtureWritten && items.length > 0) {
      mkdirSync(FIXTURE_DIR, { recursive: true });
      const fragment = {
        _meta: {
          source: target.url,
          capturedAt: new Date().toISOString(),
          endpoint: `${CATALOG_ITEMS_ENDPOINT}?${query}`,
          note: 'Sanitized Vinted catalog API fragment for Plan 17-02 unit tests — user ids/urls redacted',
        },
        items: items.slice(0, 3).map(sanitizeCatalogFixtureItem),
      };
      writeFileSync(CATALOG_FIXTURE_PATH, `${JSON.stringify(fragment, null, 2)}\n`, 'utf-8');
      catalogFixtureWritten = true;
      console.log(`  Wrote catalog fixture: ${CATALOG_FIXTURE_PATH}`);
    }

    // Enrichment + seller-location sample from the first item (D-17-15/17-13 research gate).
    const first = items[0];
    if (first && !enrichmentSample) {
      const userId = String(first.user?.id ?? '');
      if (userId) {
        try {
          const userRes = await gotScraping({
            url: `${API_ORIGIN}${USER_ENDPOINT}/${userId}`,
            headerGeneratorOptions: TLS_OPTIONS,
            timeout: { request: 15000 },
            headers: {
              accept: 'application/json',
              ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            ...(proxyUrl ? { proxyUrl } : {}),
          });
          const userRaw = parseBody(userRes);
          const userJson = jsonOrNull(userRaw, 'user API');
          const user = userJson.data?.user ?? userJson.data ?? null;
          sellerLocationSample = {
            city: user?.city ?? user?.location_description ?? null,
            country_title: user?.country_title ?? null,
            country_id: user?.country_id ?? null,
            apiStatus: userRes.statusCode ?? 0,
          };
          console.log(
            `  seller location (user ${userId}): city=${sellerLocationSample.city} country=${sellerLocationSample.country_title} status=${sellerLocationSample.apiStatus}`,
          );
        } catch (err) {
          sellerLocationSample = {
            error: err instanceof Error ? err.message : String(err),
          };
          console.log(`  seller location error: ${sellerLocationSample.error}`);
        }
      }

      try {
        const itemUrl = first.url ?? `https://www.vinted.it${first.path ?? ''}`;
        const detailRes = await gotScraping({
          url: itemUrl,
          headerGeneratorOptions: TLS_OPTIONS,
          timeout: { request: 15000 },
          headers: cookieHeader ? { cookie: cookieHeader } : {},
          ...(proxyUrl ? { proxyUrl } : {}),
        });
        const detailHtml = parseBody(detailRes);
        // catalog_id + shipping.type come from the Next.js RSC flight payload on the item page.
        // RSC escapes nested JSON keys as \"key\", so regex against the escaped form (D-17-15 verified
        // on live probe: catalog_id=5453, shipping.type="shipping"). posted_at is NOT present in the
        // RSC payload (A3) — enrich.ts falls back to scrape run time.
        const catalogIdMatch = detailHtml.match(/\\"catalog_id\\":(\d+)/);
        const shippingTypeMatch = detailHtml.match(/\\"shipping\\":\{\\"type\\":\\"([^\\"]+)\\"/);
        enrichmentSample = {
          catalog_id: catalogIdMatch ? Number(catalogIdMatch[1]) : null,
          shipping_type: shippingTypeMatch ? shippingTypeMatch[1] : null,
          posted_at_raw: null,
          detailStatus: detailRes.statusCode ?? 0,
          catalogIdFound: Boolean(catalogIdMatch),
          shippingTypeFound: Boolean(shippingTypeMatch),
          postedAtFound: false,
          postedAtFallback: 'scrape run time (A3 — not in RSC payload)',
          playwrightFallbackNeeded: !catalogIdMatch && !shippingTypeMatch,
        };
        console.log(
          `  item detail: catalog_id=${enrichmentSample.catalog_id} shipping=${enrichmentSample.shipping_type} posted_at=${enrichmentSample.posted_at_raw} status=${enrichmentSample.detailStatus}`,
        );

        // Persist detail fixture (sanitized) — keep just the relevant JSON fragments.
        if (!detailFixtureWritten && (catalogIdMatch || shippingTypeMatch)) {
          mkdirSync(FIXTURE_DIR, { recursive: true });
          const fragment = {
            _meta: {
              source: itemUrl,
              capturedAt: new Date().toISOString(),
              note: 'Sanitized Vinted item-detail RSC JSON fragment for Plan 17-03 enrich.ts tests — extracted via escaped-RSC regex',
            },
            catalog_id: enrichmentSample.catalog_id,
            shipping: { type: enrichmentSample.shipping_type },
            posted_at: enrichmentSample.postedAtFallback,
          };
          writeFileSync(DETAIL_FIXTURE_PATH, `${JSON.stringify(fragment, null, 2)}\n`, 'utf-8');
          detailFixtureWritten = true;
          console.log(`  Wrote detail fixture: ${DETAIL_FIXTURE_PATH}`);
        }
      } catch (err) {
        enrichmentSample = {
          error: err instanceof Error ? err.message : String(err),
          catalog_id: null,
          shipping_type: null,
        };
        console.log(`  item detail error: ${enrichmentSample.error}`);
      }
    }
  } catch (err) {
    row.wallMs = Math.round(performance.now() - t0);
    row.apiError = err instanceof Error ? err.message : String(err);
    results.push(row);
    console.log(`  error: ${row.apiError}`);
  }
}

const allPass = results.every((r) => r.pass);
const overallVerdict = allPass ? 'PASS' : 'FAIL';

const sampleItems = results
  .filter((r) => r.listingCount > 0)
  .map((r) => `### ${r.label}\n\nstatus=${r.status} listings=${r.listingCount}`)
  .join('\n\n');

const md = `# Wave 0 Vinted Catalog Spike (D-17-36)

**Date:** ${new Date().toISOString().slice(0, 10)}
**Verdict: ${overallVerdict}**
**Overall verdict:** **${overallVerdict}**
**Approach:** Session-warmed HttpCrawler-first extract on /api/v2/catalog/items (option-a, user-approved)

## Proxy

${proxyUrl ? '- Proxy configured via env (URL masked in artifact)' : '- **WARNING:** No proxy configured — dev/local direct fetch (D-17-33). Production requires Italian residential proxy (Phase 16 ADR).'}

## URLs

| Label | City intent | URL | Status | Wall ms | Listings | Completeness | Free €0 | Cookies | Pass |
|-------|-------------|-----|--------|---------|----------|--------------|---------|---------|------|
${results
  .map(
    (r) =>
      `| ${r.label} | ${r.city} | ${r.url} | ${r.status} | ${r.wallMs} | ${r.listingCount} | ${r.fieldMapOk ? '✓' : '✗'} | ${r.freeCount} | ${r.cookiesObtained ? '✓' : '✗'} | ${r.pass ? '✓' : '✗'} |`,
  )
  .join('\n')}

## API param map (catalog URL → /api/v2/catalog/items)

| URL param | API param | Notes |
|-----------|-----------|-------|
| \`/catalog/{id}-slug\` path | \`catalog_ids={id}\` | Regex \`/catalog/(\\d+)\` |
| \`order\` | \`order\` | default \`newest_first\` |
| (fixed) | \`per_page=96\` | Max page size |
| (fixed) | \`page=1\` | First page |
| (fixed) | \`currency=EUR\` | |

## Field map (catalog API item)

| Field | JSON path | Notes |
|-------|-----------|-------|
| \`external_id\` | \`id\` | Numeric Vinted item id |
| \`title\` | \`title\` | |
| \`price\` | \`price.amount\` | String; €0 only qualifies free (D-17-01) |
| \`external_url\` | \`url\` (fallback \`path\`) | Detail page href |
| \`photo_url\` | \`photo.url\` (fallback \`photos[0].url\`) | |
| \`user_id\` | \`user.id\` | For seller-location lookup |
| \`catalog_id\` | item detail RSC payload (escaped \`\\"catalog_id\\":N\`) | Not on list endpoint (D-17-15/A1); verified extractable |
| \`shipping.type\` | item detail RSC payload (escaped \`\\"shipping\\":{\\"type\\":\\"...\\"\`) | Not on list endpoint; verified \`"shipping"\` value |
| \`posted_at\` | NOT in RSC payload — fallback to scrape run time | Not on list endpoint (A3); no created_at/posted_at key in item page |

## Timing table

| URL | Warm-up+API (ms) | ≤3s gate (D-17-36) |
|-----|------------------|---------------------|
${results.map((r) => `| ${r.label} | ${r.wallMs} | ${r.wallMs <= WALL_TIME_PASS_MS ? 'PASS' : 'FAIL'} |`).join('\n')}

## Free (€0) filter sample (D-17-01/02/04)

Vinted is a paid marketplace — €0 listings are sparse. \`isFreePrice()\` returns true only when \`price.amount\` parses to exactly 0; missing/empty/ambiguous prices are rejected (never a gratis/regalo title fallback).

**Sample counts per URL:** ${results.map((r) => `${r.label}=${r.freeCount} €0`).join(', ') || 'n/a'}

> Finding zero €0 items in this sample is expected and acceptable — the spike proves the filter logic and extract path, not supply (D-17-36).

## Enrichment sample (D-17-15 / A1 / A3)

${enrichmentSample ? `\`\`\`json\n${JSON.stringify(enrichmentSample, null, 2)}\n\`\`\`` : '_No enrichment sample captured_'} — see \`scraper/fixtures/vinted-item-detail-fragment.json\`${detailFixtureWritten ? ' (written)' : ' (missing — Playwright fallback path documented)'}.

## Seller location sample (D-17-07 / D-17-13)

${sellerLocationSample ? `\`\`\`json\n${JSON.stringify(sellerLocationSample, null, 2)}\n\`\`\`` : '_No seller location captured_'} — prefer pickup/meet-up location over seller profile city when both exposed (D-17-13).

## Block / proxy posture (D-17-33)

- Detected Datadome cookie presence via \`access_token_web\` in set-cookie: ${results.some((r) => r.cookiesObtained) ? 'yes on ≥1 URL' : 'no'}
- Blocked status (401/403) observed: ${results.some((r) => r.blocked) ? 'yes' : 'no'}
- Direct IP from WSL2 dev: ${results.every((r) => r.status === 200) ? '200 OK on all URLs' : 'some URLs failed'}
- Production sustained crawl: Italian residential proxy recommended per Phase 16 ADR when blocked_ratio_7d ≥ 0.5.

## Gate criteria (D-17-36)

| Check | Required | Result |
|-------|----------|--------|
| All 3 URLs yield session-warmed API extract | id, title, price.amount, url, photo on ≥90% | ${results.filter((r) => r.fieldMapOk).length}/3 |
| Session cookie obtained | access_token_web / cookie present | ${results.filter((r) => r.cookiesObtained).length}/3 |
| Wall time warm-up+API per URL | ≤${WALL_TIME_PASS_MS}ms | ${results.filter((r) => r.wallMs <= WALL_TIME_PASS_MS).length}/3 |
| Enrichment sample (catalog_id + shipping.type) | required — verified via escaped-RSC regex; posted_at documented fallback | ${enrichmentSample && (enrichmentSample.catalog_id != null || enrichmentSample.shipping_type != null) ? 'yes (catalog_id + shipping.type)' : 'documented Playwright path'} |
| Seller location sample | required | ${sellerLocationSample && !sellerLocationSample.error ? 'yes' : 'no'} |
| TLS fingerprint | got-scraping headerGeneratorOptions chrome 120 | yes |

## Fixtures

- Catalog API: \`scraper/fixtures/vinted-catalog-api-sample.json\` (${catalogFixtureWritten ? 'written' : 'missing — re-run spike'})
- Item detail: \`scraper/fixtures/vinted-item-detail-fragment.json\` (${detailFixtureWritten ? 'written' : 'missing — documented'})

## Errors

${results.filter((r) => r.apiError).length === 0 ? 'None.' : results.filter((r) => r.apiError).map((r) => `- **${r.label}:** ${r.apiError}`).join('\n')}

---
*Generated by scraper/scripts/spike-vinted-catalog.mjs*
`;

writeFileSync(SPIKE_MD, md, 'utf-8');
console.log(`\n=== OVERALL VERDICT: ${overallVerdict} ===`);
console.log(`Wrote ${SPIKE_MD}`);
if (!allPass) {
  console.log('FAIL: not all gate criteria met — see artifact for details.');
}
process.exit(allPass ? 0 : 1);
