// D-18 Wave 0 Facebook Marketplace spike — prove Playwright + GraphQL intercept on 3 Venice URLs.
//
// Run: FB_SESSION_JSON=./fb-session.json PROXY_URL=… node scraper/scripts/spike-facebook-marketplace.mjs
// (from repo root; uses Playwright + residential proxy + operator session cookies)
//
// Gate (D-18-19): PASS requires all 3 Venice URLs with session+proxy: title, free price field,
// image, external_id, location on ≥90% cards, ≤15s/URL wall time.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md',
);
const FIXTURE_DIR = join(REPO_ROOT, 'scraper/fixtures');
const SEARCH_FIXTURE_PATH = join(FIXTURE_DIR, 'facebook-search-graphql-sample.json');
const DETAIL_FIXTURE_PATH = join(FIXTURE_DIR, 'facebook-item-detail-fragment.json');

/** D-18-30: Wave 0 Venice-only URLs with newest-first sort. */
const TARGET_URLS = [
  {
    label: 'venice/gratis',
    url: 'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend',
  },
  {
    label: 'venice/regalo',
    url: 'https://www.facebook.com/marketplace/venice/search/?query=regalo&sortBy=creation_time_descend',
  },
  {
    label: 'venice/free',
    url: 'https://www.facebook.com/marketplace/venice/search/?query=free&sortBy=creation_time_descend',
  },
];

const WALL_TIME_PASS_MS = 15000;
const GRAPHQL_PATH = '/api/graphql/';

const FREE_FORMATTED = new Set(['free', 'gratis', 'gratuito']);

function maskProxyHost(proxyUrl) {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return '[invalid proxy url]';
  }
}

function parseProxyForPlaywright(proxyUrl) {
  const u = new URL(proxyUrl);
  return {
    server: `${u.protocol}//${u.host}`,
    username: u.username || undefined,
    password: u.password || undefined,
  };
}

function loadSession(sessionPath) {
  const raw = readFileSync(sessionPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (parsed?.cookies && Array.isArray(parsed.cookies)) {
    return { cookies: parsed.cookies, storageState: parsed };
  }
  if (Array.isArray(parsed)) {
    return { cookies: parsed, storageState: null };
  }
  throw new Error('FB_SESSION_JSON must be Playwright storageState or cookie array JSON');
}

function isLoginWallUrl(url) {
  return /\/login\/?(\?|$)/i.test(url) || /\/checkpoint\/?(\?|$)/i.test(url);
}

function isFacebookFreePrice(amount, formatted) {
  if (amount != null && amount !== '') {
    const trimmed = String(amount).trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed) && Number.parseFloat(trimmed) === 0) return true;
  }
  if (formatted) {
    const norm = formatted.trim().toLowerCase().replace(/\s+/g, ' ');
    if (FREE_FORMATTED.has(norm)) return true;
    if (/^0([.,]00)?(\s*[€$])?$/.test(norm)) return true;
  }
  return false;
}

function extractListingsFromGraphqlBody(json) {
  const root = json ?? {};
  const data = root.data ?? root;
  const search = data.marketplace_search;
  const feedUnits =
    search?.feed_units ?? data.viewer?.marketplace_feed_units;
  const edges = feedUnits?.edges ?? [];
  const cards = [];

  for (const edge of edges) {
    const node = edge?.node?.listing;
    if (!node) continue;
    const external_id = String(node.id ?? '');
    const title = String(node.marketplace_listing_title ?? node.custom_title ?? '').trim();
    const price_amount = node.listing_price?.amount ?? '';
    const price_formatted = node.listing_price?.formatted_amount ?? null;
    const photo_url = node.primary_listing_photo?.image?.uri ?? '';
    const location_label = node.location?.reverse_geocode?.city ?? '';
    if (!external_id || !title || !photo_url) continue;
    cards.push({
      external_id,
      title,
      price_amount,
      price_formatted,
      photo_url,
      location_label,
      category_id: node.marketplace_listing_category_id ?? null,
      delivery_types: node.delivery_types ?? [],
      external_url: `https://www.facebook.com/marketplace/item/${external_id}/`,
    });
  }
  return cards;
}

function fieldComplete(card) {
  return Boolean(
    card.external_id &&
      card.title &&
      card.photo_url &&
      (card.price_amount !== '' || card.price_formatted) &&
      card.location_label,
  );
}

function fieldCompleteness(cards) {
  if (cards.length === 0) return { score: 0, complete: 0, total: 0 };
  const complete = cards.filter(fieldComplete).length;
  return { score: complete / cards.length, complete, total: cards.length };
}

function sanitizeGraphqlFixture(body, sourceUrl) {
  const edges = body?.data?.marketplace_search?.feed_units?.edges ?? [];
  return {
    _meta: {
      source: sourceUrl,
      capturedAt: new Date().toISOString(),
      endpoint: `POST ${GRAPHQL_PATH}`,
      note: 'Sanitized Facebook GraphQL fragment — cookies/PII redacted',
    },
    data: {
      marketplace_search: {
        feed_units: {
          edges: edges.slice(0, 3).map((edge) => {
            const listing = edge?.node?.listing;
            if (!listing) return edge;
            return {
              node: {
                listing: {
                  id: listing.id,
                  marketplace_listing_title: listing.marketplace_listing_title,
                  listing_price: listing.listing_price,
                  primary_listing_photo: listing.primary_listing_photo,
                  location: listing.location,
                  marketplace_listing_category_id: listing.marketplace_listing_category_id,
                  delivery_types: listing.delivery_types,
                },
              },
            };
          }),
        },
      },
    },
  };
}

function sanitizeDetailFixture(listing) {
  return {
    _meta: {
      source: listing.external_url,
      capturedAt: new Date().toISOString(),
      note: 'Sanitized detail fragment — pickup/category field names only',
    },
    marketplace_listing_category_id: listing.category_id,
    delivery_types: listing.delivery_types,
    pickup_info: listing.location_label
      ? { location_text: listing.location_label }
      : null,
    listing_price: {
      amount: listing.price_amount,
      formatted_amount: listing.price_formatted,
    },
  };
}

async function probeSession(page, cookies) {
  const hasUser = cookies.some((c) => c.name === 'c_user' && c.value);
  const t0 = performance.now();
  await page.goto('https://www.facebook.com/marketplace/', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  const finalUrl = page.url();
  const wallMs = Math.round(performance.now() - t0);
  const loginWall = isLoginWallUrl(finalUrl);
  return {
    hasUser,
    finalUrl,
    loginWall,
    wallMs,
    valid: hasUser && !loginWall,
    expired: !hasUser || loginWall,
  };
}

async function fetchUrl(page, targetUrl, timeoutMs = 20000) {
  const graphqlBodies = [];

  const onResponse = async (response) => {
    try {
      const url = response.url();
      if (!url.includes(GRAPHQL_PATH) || response.request().method() !== 'POST') return;
      const ct = response.headers()['content-type'] ?? '';
      if (!ct.includes('json')) return;
      const json = await response.json();
      graphqlBodies.push(json);
    } catch {
      // ignore parse failures on unrelated graphql responses
    }
  };

  page.on('response', onResponse);
  const t0 = performance.now();
  let status = 0;
  let finalUrl = targetUrl;
  let error = null;

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    status = response?.status() ?? 0;
    finalUrl = page.url();
    await page.waitForTimeout(2500);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    page.off('response', onResponse);
  }

  const wallMs = Math.round(performance.now() - t0);
  let cards = [];
  for (const body of graphqlBodies) {
    cards = cards.concat(extractListingsFromGraphqlBody(body));
  }

  return {
    status,
    finalUrl,
    loginWall: isLoginWallUrl(finalUrl),
    wallMs,
    graphqlResponseCount: graphqlBodies.length,
    cards,
    graphqlBodies,
    error,
  };
}

// ---------------------------------------------------------------- main

console.log('=== D-18 Wave 0 Facebook Marketplace spike ===');
console.log('Approach: PlaywrightCrawler + GraphQL intercept (option-a, user-approved D-18-07)');

function writeFailArtifact(reason, extra = {}) {
  const md = `# Wave 0 Facebook Marketplace Spike (D-18-19)

**Date:** ${new Date().toISOString().slice(0, 10)}
**Verdict: FAIL**
**Approach:** Playwright + POST /api/graphql/ intercept (option-a, D-18-07 user-approved)
**Live run:** not executed — ${reason}

## Failure reason

${reason}

## GraphQL field map (from 18-RESEARCH — pending live confirmation)

| Field | JSON path | Notes |
|-------|-----------|-------|
| \`external_id\` | \`data.marketplace_search.feed_units.edges[].node.listing.id\` | Marketplace item id |
| \`title\` | \`…listing.marketplace_listing_title\` | |
| \`listing_price.amount\` | \`…listing.listing_price.amount\` | |
| \`listing_price.formatted_amount\` | \`…listing.listing_price.formatted_amount\` | Gratis/Free tokens |
| \`photo_url\` | \`…listing.primary_listing_photo.image.uri\` | |
| \`location\` | \`…listing.location.reverse_geocode.city\` | |

## Session probe results

Live probe not run. Unit tests cover login redirect → \`session_expired\` via \`classifySessionProbeUrl\`.

## Fixtures

- Search GraphQL: \`scraper/fixtures/facebook-search-graphql-sample.json\` (mock for CI)
- Item detail: \`scraper/fixtures/facebook-item-detail-fragment.json\` (mock for CI)

## Gate criteria (D-18-19)

| Check | Required | Result |
|-------|----------|--------|
| Session + proxy configured | FB_SESSION_JSON + PROXY_URL | FAIL |
| Live extract on 3 Venice URLs | session + proxy | not run |

${extra.details ?? ''}

---
*Generated by scraper/scripts/spike-facebook-marketplace.mjs*
`;
  writeFileSync(SPIKE_MD, md, 'utf-8');
  console.log(`Wrote ${SPIKE_MD}`);
}

const sessionPath = process.env.FB_SESSION_JSON;
const proxyUrl = process.env.PROXY_URL ?? process.env.SCRAPER_PROXY_URL ?? null;

if (!sessionPath || !existsSync(sessionPath)) {
  console.error('FAIL: FB_SESSION_JSON required (operator Playwright storageState or cookie array path)');
  writeFailArtifact('FB_SESSION_JSON missing or path not found');
  process.exit(1);
}
if (!proxyUrl) {
  console.error('FAIL: PROXY_URL required for Facebook (D-18-08 — no direct fallback)');
  writeFailArtifact('PROXY_URL missing (D-18-08)');
  process.exit(1);
}

let session;
try {
  session = loadSession(sessionPath);
} catch (err) {
  console.error(`FAIL: invalid FB_SESSION_JSON — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const proxyMasked = maskProxyHost(proxyUrl);
let proxyCountry = 'unknown';
try {
  proxyCountry = new URL(proxyUrl).hostname.includes('it') ? 'IT (hostname heuristic)' : 'see provider dashboard';
} catch {
  proxyCountry = 'unknown';
}

const results = [];
let searchFixtureWritten = false;
let detailFixtureWritten = false;
let sessionProbeValid = null;
let sessionProbeExpired = null;
let freePriceSamples = [];
let pickupCategorySample = null;

const browser = await chromium.launch({
  headless: true,
  proxy: parseProxyForPlaywright(proxyUrl),
});

const context = await browser.newContext({
  locale: 'it-IT',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});

if (session.storageState) {
  await context.addCookies(session.cookies);
} else {
  await context.addCookies(session.cookies);
}

const probePage = await context.newPage();

console.log('\n--- Pre-flight session probe (D-18-12) ---');
const probe = await probeSession(probePage, session.cookies);
sessionProbeValid = probe;
console.log(
  `  c_user=${probe.hasUser} finalUrl=${probe.finalUrl} loginWall=${probe.loginWall} valid=${probe.valid} wallMs=${probe.wallMs}`,
);

// Force-expired probe documentation: strip c_user and re-probe
const expiredCookies = session.cookies.map((c) =>
  c.name === 'c_user' ? { ...c, value: '' } : c,
);
const expiredContext = await browser.newContext({ locale: 'it-IT' });
await expiredContext.addCookies(expiredCookies);
const expiredPage = await expiredContext.newPage();
const expiredProbe = await probeSession(expiredPage, expiredCookies);
sessionProbeExpired = expiredProbe;
console.log(
  `  forced-expired: c_user=false loginWall=${expiredProbe.loginWall} expired=${expiredProbe.expired}`,
);
await expiredPage.close();
await expiredContext.close();

if (!probe.valid) {
  console.error('FAIL: session probe did not pass — login wall or missing c_user');
}

const page = await context.newPage();

for (const target of TARGET_URLS) {
  console.log(`\nFetching: ${target.label}`);
  const row = {
    label: target.label,
    url: target.url,
    status: 0,
    finalUrl: '',
    loginWall: false,
    wallMs: 0,
    cardsParsed: 0,
    priceFieldCompleteness: 0,
    graphqlResponses: 0,
    pass: false,
    error: null,
  };

  const fetched = await fetchUrl(page, target.url);
  row.status = fetched.status;
  row.finalUrl = fetched.finalUrl;
  row.loginWall = fetched.loginWall;
  row.wallMs = fetched.wallMs;
  row.graphqlResponses = fetched.graphqlResponseCount;
  row.cardsParsed = fetched.cards.length;
  row.error = fetched.error;

  const { score } = fieldCompleteness(fetched.cards);
  row.priceFieldCompleteness = score;
  row.pass =
    !row.loginWall &&
    row.cardsParsed >= 1 &&
    row.priceFieldCompleteness >= 0.9 &&
    row.wallMs <= WALL_TIME_PASS_MS &&
    probe.valid;

  results.push(row);

  console.log(
    `  status=${row.status} finalUrl=${row.finalUrl} loginWall=${row.loginWall} wallMs=${row.wallMs} ` +
      `graphql=${row.graphqlResponses} cards=${row.cardsParsed} completeness=${(row.priceFieldCompleteness * 100).toFixed(0)}% pass=${row.pass}`,
  );

  if (fetched.cards.length > 0) {
    for (const card of fetched.cards.slice(0, 5)) {
      if (freePriceSamples.length < 5) {
        freePriceSamples.push({
          external_id: card.external_id,
          amount: card.price_amount,
          formatted: card.price_formatted,
          isFree: isFacebookFreePrice(card.price_amount, card.price_formatted),
        });
      }
    }
  }

  if (
    !searchFixtureWritten &&
    !existsSync(SEARCH_FIXTURE_PATH) &&
    fetched.graphqlBodies.length > 0
  ) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const sanitized = sanitizeGraphqlFixture(fetched.graphqlBodies[0], target.url);
    writeFileSync(SEARCH_FIXTURE_PATH, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf-8');
    searchFixtureWritten = true;
    console.log(`  Wrote search fixture: ${SEARCH_FIXTURE_PATH}`);
  }

  if (!pickupCategorySample && fetched.cards.length > 0) {
    const first = fetched.cards[0];
    pickupCategorySample = {
      category_id: first.category_id,
      delivery_types: first.delivery_types,
      location_label: first.location_label,
    };

    if (!detailFixtureWritten && !existsSync(DETAIL_FIXTURE_PATH)) {
      mkdirSync(FIXTURE_DIR, { recursive: true });
      writeFileSync(
        DETAIL_FIXTURE_PATH,
        `${JSON.stringify(sanitizeDetailFixture(first), null, 2)}\n`,
        'utf-8',
      );
      detailFixtureWritten = true;
      console.log(`  Wrote detail fixture: ${DETAIL_FIXTURE_PATH}`);
    }
  }
}

await page.close();
await probePage.close();
await context.close();
await browser.close();

const allPass = probe.valid && results.every((r) => r.pass);
const overallVerdict = allPass ? 'PASS' : 'FAIL';

const md = `# Wave 0 Facebook Marketplace Spike (D-18-19)

**Date:** ${new Date().toISOString().slice(0, 10)}
**Verdict: ${overallVerdict}**
**Approach:** Playwright + POST /api/graphql/ intercept (option-a, D-18-07 user-approved)
**Live run:** ${probe.valid ? 'executed with session + proxy' : 'session/proxy env present but probe failed'}

## Proxy

- Host (masked): \`${proxyMasked}\`
- Country: ${proxyCountry}
- Required: yes (D-18-08 — spike exits 1 without PROXY_URL)

## URLs (Venice — D-18-30)

| Label | URL | HTTP | Final URL | Login wall | Wall ms | GraphQL | Cards | Price ≥90% | ≤15s | Pass |
|-------|-----|------|-----------|------------|---------|---------|-------|------------|------|------|
${results
  .map(
    (r) =>
      `| ${r.label} | ${r.url} | ${r.status} | ${r.finalUrl} | ${r.loginWall ? 'yes' : 'no'} | ${r.wallMs} | ${r.graphqlResponses} | ${r.cardsParsed} | ${r.priceFieldCompleteness >= 0.9 ? '✓' : '✗'} | ${r.wallMs <= WALL_TIME_PASS_MS ? '✓' : '✗'} | ${r.pass ? '✓' : '✗'} |`,
  )
  .join('\n')}

## GraphQL field map

| Field | JSON path | Notes |
|-------|-----------|-------|
| \`external_id\` | \`data.marketplace_search.feed_units.edges[].node.listing.id\` | Marketplace item id |
| \`title\` | \`…listing.marketplace_listing_title\` (fallback \`custom_title\`) | |
| \`listing_price.amount\` | \`…listing.listing_price.amount\` | String numeric |
| \`listing_price.formatted_amount\` | \`…listing.listing_price.formatted_amount\` | Localized Gratis/Free |
| \`photo_url\` | \`…listing.primary_listing_photo.image.uri\` | |
| \`location\` | \`…listing.location.reverse_geocode.city\` | Pickup city label |
| \`category_id\` | \`…listing.marketplace_listing_category_id\` | Detail fallback if missing |
| \`delivery_types\` | \`…listing.delivery_types[]\` | Pickup gate (D-18-04) |

Alternate path: \`data.viewer.marketplace_feed_units.edges[]\` when search node absent.

## Timing table

| URL | Wall ms | ≤15s gate (D-18-19) |
|-----|---------|---------------------|
${results.map((r) => `| ${r.label} | ${r.wallMs} | ${r.wallMs <= WALL_TIME_PASS_MS ? 'PASS' : 'FAIL'} |`).join('\n')}

## Free-price filter sample (D-18-01)

\`isFacebookFreePrice()\` accepts structured \`0\`, \`"0"\`, and localized \`Gratis\` from price field only.

${freePriceSamples.length > 0 ? `\`\`\`json\n${JSON.stringify(freePriceSamples, null, 2)}\n\`\`\`` : '_No live price samples — mock fixtures used for CI_'}

> Zero free items in live sample is acceptable if filter logic is documented (D-18-19).

## Session probe results (D-18-09/12)

**Valid session probe:**
\`\`\`json
${JSON.stringify(sessionProbeValid, null, 2)}
\`\`\`

**Forced-expired probe (c_user cleared):**
\`\`\`json
${JSON.stringify(sessionProbeExpired, null, 2)}
\`\`\`

Login redirect (\`/login/\`, \`/checkpoint/\`) → \`session_expired\`; missing \`c_user\` → expired.

## Pickup / category samples

${pickupCategorySample ? `\`\`\`json\n${JSON.stringify(pickupCategorySample, null, 2)}\n\`\`\`` : '_See scraper/fixtures/facebook-item-detail-fragment.json mock_'}

## Gate criteria (D-18-19)

| Check | Required | Result |
|-------|----------|--------|
| Session + proxy configured | FB_SESSION_JSON + PROXY_URL | yes |
| Session probe valid | no login wall | ${probe.valid ? 'PASS' : 'FAIL'} |
| All 3 URLs extract cards | ≥1 listing, ≥90% price field | ${results.filter((r) => r.pass).length}/3 |
| Wall time per URL | ≤${WALL_TIME_PASS_MS}ms | ${results.filter((r) => r.wallMs <= WALL_TIME_PASS_MS).length}/3 |

## Fixtures

- Search GraphQL: \`scraper/fixtures/facebook-search-graphql-sample.json\` (${existsSync(SEARCH_FIXTURE_PATH) ? 'present' : 'missing'})
- Item detail: \`scraper/fixtures/facebook-item-detail-fragment.json\` (${existsSync(DETAIL_FIXTURE_PATH) ? 'present' : 'missing'})

## Errors

${results.filter((r) => r.error).length === 0 ? 'None.' : results.filter((r) => r.error).map((r) => `- **${r.label}:** ${r.error}`).join('\n')}

---
*Generated by scraper/scripts/spike-facebook-marketplace.mjs*
`;

writeFileSync(SPIKE_MD, md, 'utf-8');
console.log(`\n=== OVERALL VERDICT: ${overallVerdict} ===`);
console.log(`Wrote ${SPIKE_MD}`);
process.exit(allPass ? 0 : 1);
