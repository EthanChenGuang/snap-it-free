// D-25-02 Wallapop Wave 0 spike — prove /api/v3/general/search extract with max_sale_price=0 via proxy.
//
// Run (from repo root):
//   cd scraper && node scripts/spike-wallapop-search.mjs
//
// Requires proxy chain in scraper/.env (DataImpulse → Webshare → Decodo).
// Gate: PASS when Venice 15km returns ≥1 €0 listing with id/title/price/url/photo on ≥90% of items.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { gotScraping } from 'got-scraping';
import { resolveProxyChain } from '../../lib/admin/proxy-chain.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv({ path: join(REPO_ROOT, 'scraper/.env') });

const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/quick/20260825-wallapop-free-supply-proxy-roi/SPIKE-WALLAPOP-SEARCH.md',
);

const TARGETS = [
  {
    label: 'gratis Venice 15km',
    seed: 'https://it.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155&distance_in_km=15',
  },
  {
    label: 'regalo Venice 15km',
    seed: 'https://it.wallapop.com/app/search?keywords=regalo&latitude=45.4408&longitude=12.3155&distance_in_km=15',
  },
  {
    label: 'all €0 Venice 15km',
    seed: 'https://it.wallapop.com/app/search?latitude=45.4408&longitude=12.3155&distance_in_km=15',
  },
];

const TLS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};

function isFreePrice(amount) {
  if (amount == null || amount === '') return false;
  return Number.parseFloat(String(amount)) === 0;
}

function seedToApiUrl(seedUrl) {
  const u = new URL(seedUrl);
  const params = new URLSearchParams();
  params.set('filters_source', 'search_box');
  params.set('latitude', u.searchParams.get('latitude') ?? '45.4408');
  params.set('longitude', u.searchParams.get('longitude') ?? '12.3155');
  params.set('distance_in_km', u.searchParams.get('distance_in_km') ?? '15');
  params.set('max_sale_price', '0');
  params.set('order_by', 'newest');
  const kw = u.searchParams.get('keywords')?.trim();
  if (kw) params.set('keywords', kw);
  return `https://api.wallapop.com/api/v3/general/search?${params.toString()}`;
}

function mapItem(item) {
  const slug = item.web_slug ?? item.slug ?? '';
  const photo =
    item.image ??
    item.images?.[0]?.urls?.medium ??
    item.images?.[0]?.urls?.big ??
    '';
  return {
    external_id: String(item.id ?? ''),
    title: item.title ?? '',
    price: item.price ?? '',
    url: slug ? `https://it.wallapop.com/item/${slug}` : '',
    photo_url: photo,
    city: item.location?.city ?? '',
  };
}

function fieldComplete(row) {
  return Boolean(row.external_id && row.title && row.url && row.photo_url && row.price !== '');
}

const proxyChain = resolveProxyChain();
const proxyUrls =
  proxyChain.length > 0
    ? proxyChain.map((entry) => entry.url)
    : [
        process.env.SCRAPER_PROXY_URL?.trim(),
        process.env.PROXY_URL?.trim(),
        process.env.HTTP_PROXY?.trim(),
      ].filter(Boolean);

if (proxyUrls.length === 0) {
  console.error('ERROR: Configure proxy chain in scraper/.env (PROXY_URL_* or PROXY_URL).');
  process.exit(1);
}

console.log(
  `Proxy chain: ${proxyChain.map((entry) => `${entry.provider}@${entry.hostMasked}`).join(' → ') || proxyUrls.length + ' URL(s)'}`,
);

function isProxyQuotaError(message) {
  return /402|407|payment required|bandwidth limit|traffic limit|quota/i.test(message ?? '');
}

async function fetchWithProxyChain(apiUrl, seed) {
  let lastError = null;
  for (const proxyUrl of proxyUrls) {
    try {
      const res = await gotScraping.get(apiUrl, {
        proxyUrl,
        headerGeneratorOptions: TLS,
        timeout: { request: 30000 },
        retry: { limit: 1 },
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'it-IT,it;q=0.9',
          Origin: 'https://it.wallapop.com',
          Referer: seed,
        },
      });
      return { res, proxyUrl };
    } catch (err) {
      lastError = err;
      if (isProxyQuotaError(err.message)) {
        console.warn(`[proxy failover] ${new URL(proxyUrl).hostname} quota/blocked — trying next`);
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error('All proxy providers failed');
}

const results = [];

for (const target of TARGETS) {
  const apiUrl = seedToApiUrl(target.seed);
  const start = Date.now();
  const row = {
    label: target.label,
    seed: target.seed,
    apiUrl,
    status: 0,
    ms: 0,
    total: 0,
    freeCount: 0,
    completeRate: 0,
    blocked: false,
    error: null,
    sample: [],
  };

  try {
    const { res } = await fetchWithProxyChain(apiUrl, target.seed);
    row.status = res.statusCode;
    row.ms = Date.now() - start;
    const body = typeof res.body === 'string' ? res.body : res.body.toString();
    if (!body.trimStart().startsWith('{')) {
      row.blocked = true;
      row.error = `Non-JSON body: ${body.slice(0, 120)}`;
    } else {
      const data = JSON.parse(body);
      const objects = data.search_objects ?? [];
      const mapped = objects.map(mapItem);
      row.total = mapped.length;
      row.freeCount = mapped.filter((m) => isFreePrice(m.price)).length;
      row.completeRate =
        mapped.length === 0
          ? 0
          : mapped.filter(fieldComplete).length / mapped.length;
      row.sample = mapped.slice(0, 3);
    }
  } catch (err) {
    row.ms = Date.now() - start;
    row.error = err.message?.slice(0, 200) ?? String(err);
    row.status = err.response?.statusCode ?? 0;
    row.blocked = true;
  }

  results.push(row);
  console.log(
    `[${row.label}] status=${row.status} total=${row.total} free€0=${row.freeCount} complete=${(row.completeRate * 100).toFixed(0)}% ${row.error ?? 'OK'}`,
  );
  await new Promise((r) => setTimeout(r, 2000));
}

const totalFree = results.reduce((sum, r) => sum + r.freeCount, 0);
const anyBlocked = results.every((r) => r.blocked || r.total === 0);
const gatePass = totalFree >= 10 || (totalFree >= 1 && results.some((r) => r.completeRate >= 0.9));

const verdict = gatePass ? 'PASS' : anyBlocked && totalFree === 0 ? 'FAIL (blocked or empty)' : 'MARGINAL';

mkdirSync(dirname(SPIKE_MD), { recursive: true });
const md = `# SPIKE: Wallapop search API (D-25-02)

**Date:** ${new Date().toISOString()}
**Proxy:** configured (host masked)
**Verdict:** ${verdict}

## Gate

| Check | Result |
|-------|--------|
| ≥10 €0 listings (Go) | ${totalFree >= 10 ? 'PASS' : 'FAIL'} (${totalFree} found) |
| ≥1 €0 + 90% field complete (minimal) | ${results.some((r) => r.freeCount >= 1 && r.completeRate >= 0.9) ? 'PASS' : 'FAIL'} |

## Results

| Label | HTTP | ms | total | €0 | complete% | error |
|-------|------|-----|-------|-----|-----------|-------|
${results
  .map(
    (r) =>
      `| ${r.label} | ${r.status} | ${r.ms} | ${r.total} | ${r.freeCount} | ${(r.completeRate * 100).toFixed(0)} | ${r.error ?? '—'} |`,
  )
  .join('\n')}

## Samples

${results
  .map((r) => `### ${r.label}\n\`\`\`json\n${JSON.stringify(r.sample, null, 2)}\n\`\`\``)
  .join('\n\n')}

---
*Generated by scraper/scripts/spike-wallapop-search.mjs*
`;

writeFileSync(SPIKE_MD, md, 'utf-8');
console.log(`\n=== VERDICT: ${verdict} (total €0=${totalFree}) ===`);
console.log(`Wrote ${SPIKE_MD}`);
process.exit(gatePass ? 0 : 1);
