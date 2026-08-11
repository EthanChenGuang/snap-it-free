// D-15 Wave 0 HTTP category spike — prove __NEXT_DATA__ extraction on 3 live URLs.
//
// Run: node scraper/scripts/spike-subito-http-category.mjs
// (from repo root; uses got-scraping TLS fingerprint via crawlee transitive dep)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotScraping } from 'got-scraping';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-SPIKE-HTTP-CATEGORY.md',
);
const FIXTURE_DIR = join(REPO_ROOT, 'scraper/fixtures');
const FIXTURE_PATH = join(FIXTURE_DIR, 'subito-category-next-data-fragment.json');

/** D-15-01: Venezia arredamento-casalinghi + Padova + high-volume third category */
const TARGET_URLS = [
  {
    label: 'Venezia arredamento-casalinghi',
    url: 'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
  },
  {
    label: 'Padova arredamento-casalinghi',
    url: 'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/padova/padova/',
  },
  {
    label: 'Veneto elettrodomestici (high volume)',
    url: 'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/',
  },
];

const LISTING_ARRAY_PATH = 'props.pageProps.initialState.items.originalList';

const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};

const WALL_TIME_PASS_MS = 2000;

function parseExternalId(url) {
  const match = url?.match(/-(\d+)\.htm(?:\?|$)/);
  return match?.[1] ?? null;
}

function extractNextData(html) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return { error: 'missing __NEXT_DATA__', data: null };
  try {
    return { error: null, data: JSON.parse(m[1]) };
  } catch (err) {
    return { error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`, data: null };
  }
}

function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function extractPrice(features) {
  const price = features?.['/price'];
  const first = price?.values?.[0];
  if (!first) return null;
  return first.value ?? first.key ?? null;
}

function extractListing(item) {
  const external_url = item?.urls?.default ?? item?.urls?.mobile ?? null;
  const external_id = parseExternalId(external_url);
  const title = item?.subject ?? null;
  const price = extractPrice(item?.features);
  const images = (item?.images ?? [])
    .map((img) => img?.cdnBaseUrl)
    .filter(Boolean);
  const posted_at = item?.date ?? null;

  return {
    external_id,
    title,
    price,
    images,
    posted_at,
    external_url,
  };
}

function fieldComplete(listing) {
  return Boolean(
    listing.external_id &&
      listing.title &&
      listing.price != null &&
      listing.images.length > 0 &&
      listing.posted_at,
  );
}

function isNewestFirst(listings) {
  if (listings.length < 2) return { verdict: 'insufficient', note: '<2 listings' };
  const dates = listings
    .map((l) => Date.parse(String(l.posted_at).replace(' ', 'T')))
    .filter((d) => !Number.isNaN(d));
  if (dates.length < 2) return { verdict: 'unknown', note: 'unparseable dates' };
  let descending = true;
  for (let i = 1; i < dates.length; i += 1) {
    if (dates[i] > dates[i - 1]) {
      descending = false;
      break;
    }
  }
  return {
    verdict: descending ? 'yes' : 'no',
    note: `first=${listings[0]?.posted_at} last=${listings[listings.length - 1]?.posted_at}`,
  };
}

function sanitizeFixtureItem(item) {
  if (!item) return null;
  return {
    kind: item.kind,
    subject: item.subject,
    date: item.date,
    type: item.type,
    category: item.category
      ? { friendlyName: item.category.friendlyName, label: item.category.label }
      : undefined,
    features: item.features?.['/price']
      ? { '/price': item.features['/price'] }
      : undefined,
    images: (item.images ?? []).slice(0, 2).map((img) => ({ cdnBaseUrl: img.cdnBaseUrl })),
    urls: item.urls,
    geo: item.geo
      ? {
          city: item.geo.city ? { value: item.geo.city.value, shortName: item.geo.city.shortName } : undefined,
          town: item.geo.town ? { value: item.geo.town.value } : undefined,
        }
      : undefined,
    advertiser: item.advertiser ? { userId: '[redacted]' } : undefined,
    body: item.body ? '[redacted description]' : undefined,
  };
}

async function fetchCategory(label, url, proxyUrl) {
  const row = {
    label,
    url,
    status: 0,
    wallMs: 0,
    blocked: false,
    listingCount: 0,
    sample: null,
    fieldMapOk: false,
    error: null,
    pass: false,
  };

  const requestOptions = {
    url,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: 15000 },
  };
  if (proxyUrl) {
    requestOptions.proxyUrl = proxyUrl;
  }

  const t0 = performance.now();
  try {
    const res = await gotScraping(requestOptions);
    row.wallMs = Math.round(performance.now() - t0);
    row.status = res.statusCode ?? 0;
    const html = typeof res.body === 'string' ? res.body : res.body.toString();
    row.blocked =
      row.status === 403 ||
      /blocked|captcha|access denied/i.test(html.slice(0, 5000)) ||
      /blocked/i.test(res.headers?.['x-subito-block'] ?? '');

    const { error, data } = extractNextData(html);
    if (error) {
      row.error = error;
      return { row, nextData: null, rawList: [], html: null };
    }

    const rawList = getByPath(data, LISTING_ARRAY_PATH);
    if (!Array.isArray(rawList) || rawList.length === 0) {
      row.error = `empty or missing listing array at ${LISTING_ARRAY_PATH}`;
      return { row, nextData: data, rawList: [], html };
    }

    row.listingCount = rawList.length;
    const listings = rawList.map(extractListing);
    row.sample = listings[0];
    row.fieldMapOk = listings.some(fieldComplete);
    row.pass =
      row.status === 200 &&
      !row.blocked &&
      row.fieldMapOk &&
      row.wallMs <= WALL_TIME_PASS_MS;

    return { row, nextData: data, rawList, html };
  } catch (err) {
    row.wallMs = Math.round(performance.now() - t0);
    row.error = err instanceof Error ? err.message : String(err);
    return { row, nextData: null, rawList: [], html: null };
  }
}

// ---------------------------------------------------------------- main

console.log('=== D-15 Wave 0 HTTP category spike ===');

const proxyUrl = process.env.SCRAPER_PROXY_URL ?? process.env.HTTP_PROXY ?? null;
if (!proxyUrl) {
  console.warn('WARNING: No SCRAPER_PROXY_URL / HTTP_PROXY set — spike runs direct (D-15-17 dev optional).');
}

const results = [];
let fixtureWritten = false;

for (const target of TARGET_URLS) {
  console.log(`\nFetching: ${target.label}`);
  const { row, nextData, rawList, html } = await fetchCategory(target.label, target.url, proxyUrl);
  results.push({ ...row, order: isNewestFirst(rawList.map(extractListing)) });

  console.log(
    `  status=${row.status} wallMs=${row.wallMs} listings=${row.listingCount} ` +
      `fields=${row.fieldMapOk ? 'ok' : 'fail'} pass=${row.pass}${row.error ? ` err=${row.error}` : ''}`,
  );

  if (!fixtureWritten && rawList.length > 0 && nextData) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const fragment = {
      _meta: {
        source: target.url,
        capturedAt: new Date().toISOString(),
        listingArrayPath: LISTING_ARRAY_PATH,
        note: 'Sanitized fragment for Plan 15-03 unit tests — advertiser/body redacted',
      },
      props: {
        pageProps: {
          initialState: {
            items: {
              originalList: rawList.slice(0, 3).map(sanitizeFixtureItem),
            },
          },
        },
      },
    };
    writeFileSync(FIXTURE_PATH, `${JSON.stringify(fragment, null, 2)}\n`, 'utf-8');
    fixtureWritten = true;
    console.log(`  Wrote fixture: ${FIXTURE_PATH}`);
  }
}

const allPass = results.every((r) => r.pass);
const anyBlocked = results.some((r) => r.blocked);
const overallVerdict = allPass ? 'PASS' : 'FAIL';

const newestFirstNotes = results.map((r) => `${r.label}: ${r.order.verdict} (${r.order.note})`).join('\n');

const md = `# Wave 0 HTTP Category Spike (D-15-01 / D-15-02)

**Date:** ${new Date().toISOString().slice(0, 10)}
**Overall verdict:** ${overallVerdict}
**Stack winner:** Crawlee HttpCrawler (got-scraping TLS) — Scrapling arm not run (optional; Crawlee default per D-15-03)

## Proxy

${proxyUrl ? '- Proxy configured via env (URL masked in artifact)' : '- **WARNING:** No proxy configured — dev/local direct fetch (D-15-17). Production requires Italian residential proxy (see ADR 015-production-proxy).'}

## URLs

| Label | URL | Status | Wall ms | Listings | Fields OK | Pass |
|-------|-----|--------|---------|----------|-----------|------|
${results
  .map(
    (r) =>
      `| ${r.label} | ${r.url} | ${r.status} | ${r.wallMs} | ${r.listingCount} | ${r.fieldMapOk ? 'yes' : 'no'} | ${r.pass ? '✓' : '✗'} |`,
  )
  .join('\n')}

## Field map (__NEXT_DATA__)

**Listing array path:** \`${LISTING_ARRAY_PATH}\`

| Field | JSON path | Notes |
|-------|-----------|-------|
| \`external_id\` | \`urls.default\` → regex \`/-(\\d+)\\.htm/\` | Numeric Subito ad id |
| \`title\` | \`subject\` | Card/listing title |
| \`price\` | \`features['/price'].values[0].value\` (fallback \`.key\`) | Regalo listings show \`0 €\` |
| \`images\` | \`images[].cdnBaseUrl\` | Primary = first element |
| \`posted_at\` | \`date\` | ISO-like \`YYYY-MM-DD HH:mm:ss\` (parse to ISO in http-extract) |
| \`external_url\` | \`urls.default\` | Detail page href |

**Venezia arredamento-casalinghi:** included — \`arredamento-casalinghi/venezia/venezia/\`

## Sample listing fields (first card per URL)

${results
  .map((r) => {
    const s = r.sample;
    if (!s) return `### ${r.label}\n\n_No sample — ${r.error ?? 'empty list'}_`;
    return `### ${r.label}

\`\`\`json
${JSON.stringify(s, null, 2)}
\`\`\``;
  })
  .join('\n\n')}

## Timing table

| URL | Wall time (ms) | ≤2s gate (D-15-02) |
|-----|----------------|---------------------|
${results.map((r) => `| ${r.label} | ${r.wallMs} | ${r.wallMs <= WALL_TIME_PASS_MS ? 'PASS' : 'FAIL'} |`).join('\n')}

## TLS / got-scraping fingerprint note (D-15-22)

Primary arm uses \`gotScraping\` from \`got-scraping@4.x\` (transitive via \`crawlee\`) with:

\`\`\`json
${JSON.stringify({ headerGeneratorOptions: TLS_OPTIONS }, null, 2)}
\`\`\`

This generates Chrome 120+ desktop headers and browser-like TLS for plain HTTP category fetches. Production \`HttpCrawler\` uses the same transport (D-15-22).

## Listing order (newest-first?)

${newestFirstNotes}

**Implementation note:** Treat category card order as **newest-first** when dates are monotonic descending; Plan 15-03 early-stop walks listings in array order.

## Crawlee vs Scrapling comparison

| Arm | Block resistance | Speed (all 3 URLs) | Verdict |
|-----|------------------|--------------------|---------|
| Crawlee / got-scraping | ${anyBlocked ? 'partial block observed' : '200 OK on all 3'} | ${results.every((r) => r.wallMs <= WALL_TIME_PASS_MS) ? '≤2s all URLs' : 'some URLs >2s'} | **Default winner (D-15-03)** |
| Scrapling (Python venv) | not run | not run | N/A — optional spike arm skipped |

## Gate criteria (D-15-02)

| Check | Required | Result |
|-------|----------|--------|
| All 3 URLs return required fields from JSON | title, price, images, posted_at, external_id | ${results.filter((r) => r.fieldMapOk).length}/3 |
| Wall time per URL | ≤${WALL_TIME_PASS_MS}ms | ${results.filter((r) => r.wallMs <= WALL_TIME_PASS_MS).length}/3 |
| TLS fingerprint documented | got-scraping headerGeneratorOptions | yes |
| arredamento-casalinghi Venezia path | required | yes |

## Fixture

Captured sanitized \`__NEXT_DATA__\` fragment: \`scraper/fixtures/subito-category-next-data-fragment.json\` (${fixtureWritten ? 'written' : 'missing — re-run spike'})

## Errors

${results.filter((r) => r.error).length === 0 ? 'None.' : results.filter((r) => r.error).map((r) => `- **${r.label}:** ${r.error}`).join('\n')}

---
*Generated by scraper/scripts/spike-subito-http-category.mjs*
`;

writeFileSync(SPIKE_MD, md, 'utf-8');
console.log(`\n=== OVERALL VERDICT: ${overallVerdict} ===`);
console.log(`Wrote ${SPIKE_MD}`);
process.exit(allPass ? 0 : 1);
