// D-15 Crawlee vs Scrapling head-to-head on the same 3 Subito category URLs.
//
// Run: node scraper/scripts/spike-subito-http-compare.mjs
// Creates isolated Python venv at /tmp/scrapling-spike-venv (never in package.json).

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotScraping } from 'got-scraping';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PHASE_DIR = join(
  REPO_ROOT,
  '.planning/phases/15-scraper-incremental-crawl-and-search-efficiency',
);
const COMPARE_MD = join(PHASE_DIR, '15-SPIKE-HTTP-COMPARE.md');
const SCRAPLING_JSON = join(PHASE_DIR, '15-SPIKE-SCRAPLING.json');
const CRAWLEE_JSON = join(PHASE_DIR, '15-SPIKE-CRAWLEE.json');
const SCRAPLING_PY = join(REPO_ROOT, 'scraper/scripts/spike-subito-http-scrapling.py');
const VENV_DIR = '/tmp/scrapling-spike-venv';
const VENV_PYTHON = join(VENV_DIR, 'bin/python');
const VENV_PIP = join(VENV_DIR, 'bin/pip');

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
  return {
    external_id: parseExternalId(external_url),
    title: item?.subject ?? null,
    price: extractPrice(item?.features),
    images: (item?.images ?? []).map((img) => img?.cdnBaseUrl).filter(Boolean),
    posted_at: item?.date ?? null,
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

async function fetchCrawlee(label, url, proxyUrl) {
  const row = {
    label,
    url,
    arm: 'crawlee-got-scraping',
    status: 0,
    wallMs: 0,
    blocked: false,
    listingCount: 0,
    fieldMapOk: false,
    error: null,
    pass: false,
  };

  const requestOptions = {
    url,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: 15000 },
  };
  if (proxyUrl) requestOptions.proxyUrl = proxyUrl;

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
      return row;
    }

    const rawList = getByPath(data, LISTING_ARRAY_PATH);
    if (!Array.isArray(rawList) || rawList.length === 0) {
      row.error = `empty or missing listing array at ${LISTING_ARRAY_PATH}`;
      return row;
    }

    const listings = rawList.map(extractListing);
    row.listingCount = rawList.length;
    row.fieldMapOk = listings.some(fieldComplete);
    row.pass =
      row.status === 200 && !row.blocked && row.fieldMapOk && row.wallMs <= WALL_TIME_PASS_MS;
    return row;
  } catch (err) {
    row.wallMs = Math.round(performance.now() - t0);
    row.error = err instanceof Error ? err.message : String(err);
    return row;
  }
}

function ensureScraplingVenv() {
  if (!existsSync(VENV_PYTHON)) {
    console.log(`Creating venv at ${VENV_DIR} ...`);
    execSync(`python3 -m venv "${VENV_DIR}"`, { stdio: 'inherit' });
  }

  const pipList = spawnSync(VENV_PIP, ['show', 'scrapling'], { encoding: 'utf-8' });
  if (pipList.status !== 0) {
    console.log('Installing scrapling[fetchers] in isolated venv (HTTP Fetcher only, no browser)...');
    execSync(`"${VENV_PIP}" install -q "scrapling[fetchers]"`, { stdio: 'inherit' });
  }
}

function runScraplingArm() {
  ensureScraplingVenv();
  console.log('\n=== Scrapling Fetcher arm ===');
  const env = { ...process.env, SPIKE_SCRAPLING_JSON: SCRAPLING_JSON };
  const proc = spawnSync(VENV_PYTHON, [SCRAPLING_PY], {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf-8',
    timeout: 120_000,
  });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0 && proc.status !== 1) {
    throw new Error(`Scrapling arm failed (exit ${proc.status}): ${proc.stderr || proc.stdout}`);
  }
  if (!existsSync(SCRAPLING_JSON)) {
    throw new Error('Scrapling arm did not write JSON artifact');
  }
  return JSON.parse(readFileSync(SCRAPLING_JSON, 'utf-8'));
}

function summarizeArm(results) {
  const successCount = results.filter(
    (r) => r.status === 200 && !r.blocked && r.fieldMapOk,
  ).length;
  const fastCount = results.filter((r) => r.wallMs <= WALL_TIME_PASS_MS).length;
  const blockedCount = results.filter((r) => r.blocked || r.status !== 200).length;
  const avgWallMs = Math.round(results.reduce((s, r) => s + r.wallMs, 0) / results.length);
  return {
    successCount,
    fastCount,
    blockedCount,
    avgWallMs,
    allPass: results.every((r) => r.pass),
    blockResistance: blockedCount === 0 && successCount === results.length ? 'PASS all 3' : `${successCount}/3 OK, ${blockedCount} blocked`,
    speed:
      fastCount === results.length
        ? `≤${WALL_TIME_PASS_MS}ms all URLs (avg ${avgWallMs}ms)`
        : `${fastCount}/3 within ${WALL_TIME_PASS_MS}ms`,
  };
}

function decideWinner(crawlee, scrapling) {
  const c = summarizeArm(crawlee.results);
  const s = summarizeArm(scrapling.results);

  const scraplingWinsBlock =
    s.successCount === 3 &&
    s.blockedCount === 0 &&
    (c.successCount < 3 || c.blockedCount > 0);

  const scraplingWinsSpeed =
    s.allPass &&
    s.fastCount === 3 &&
    crawlee.results.every((cr, i) => {
      const sr = scrapling.results[i];
      return sr.pass && sr.wallMs < cr.wallMs;
    });

  let winner;
  let reason;
  if (scraplingWinsBlock && scraplingWinsSpeed) {
    winner = 'Scrapling (Fetcher / curl_cffi)';
    reason =
      'Scrapling wins block resistance AND is strictly faster on all 3 URLs (D-15-03 override). Python migration should be re-evaluated.';
  } else if (c.allPass && !scraplingWinsBlock && !scraplingWinsSpeed) {
    winner = 'Crawlee HttpCrawler (got-scraping)';
    reason =
      'Crawlee passes all gates; Scrapling did not beat Crawlee on both block resistance and speed on all 3 URLs — default winner per D-15-03.';
  } else if (c.allPass && s.allPass) {
    winner = 'Crawlee HttpCrawler (got-scraping)';
    reason = `Both arms pass all gates; Crawlee default per D-15-03 (Scrapling block win=${scraplingWinsBlock}, speed win=${scraplingWinsSpeed}).`;
  } else if (s.allPass && !c.allPass) {
    winner = 'Scrapling (Fetcher / curl_cffi)';
    reason = 'Scrapling passes all gates while Crawlee failed — re-spike favors Scrapling escape hatch.';
  } else if (c.allPass && !s.allPass) {
    winner = 'Crawlee HttpCrawler (got-scraping)';
    reason = 'Only Crawlee passes all gates.';
  } else {
    winner = 'Neither (both FAIL)';
    reason = 'Both arms failed at least one URL — investigate proxy/blocking before production cutover.';
  }

  return { winner, reason, scraplingWinsBlock, scraplingWinsSpeed, crawleeSummary: c, scraplingSummary: s };
}

function renderTable(results) {
  return results
    .map(
      (r) =>
        `| ${r.label} | ${r.status} | ${r.wallMs} | ${r.blocked ? 'yes' : 'no'} | ${r.listingCount} | ${r.fieldMapOk ? 'yes' : 'no'} | ${r.pass ? '✓' : '✗'} |`,
    )
    .join('\n');
}

function renderSideBySide(crawlee, scrapling) {
  return TARGET_URLS.map((t, i) => {
    const c = crawlee.results[i];
    const s = scrapling.results[i];
    const faster = c.wallMs === s.wallMs ? 'tie' : c.wallMs < s.wallMs ? 'Crawlee' : 'Scrapling';
    return `| ${t.label} | ${c.wallMs} | ${s.wallMs} | ${faster} | ${c.pass ? '✓' : '✗'} | ${s.pass ? '✓' : '✗'} |`;
  }).join('\n');
}

async function main() {
  console.log('=== D-15 Crawlee vs Scrapling compare ===');
  mkdirSync(PHASE_DIR, { recursive: true });

  const proxyUrl = process.env.SCRAPER_PROXY_URL ?? process.env.HTTP_PROXY ?? null;
  if (!proxyUrl) {
    console.warn('WARNING: No SCRAPER_PROXY_URL / HTTP_PROXY — direct fetch (dev spike).');
  }

  console.log('\n=== Crawlee / got-scraping arm ===');
  const crawleeResults = [];
  for (const target of TARGET_URLS) {
    console.log(`Fetching: ${target.label}`);
    const row = await fetchCrawlee(target.label, target.url, proxyUrl);
    crawleeResults.push(row);
    console.log(
      `  status=${row.status} wallMs=${row.wallMs} pass=${row.pass}${row.error ? ` err=${row.error}` : ''}`,
    );
  }

  const crawleePayload = {
    arm: 'crawlee-got-scraping',
    proxyConfigured: Boolean(proxyUrl),
    wallTimePassMs: WALL_TIME_PASS_MS,
    results: crawleeResults,
    allPass: crawleeResults.every((r) => r.pass),
    blockedCount: crawleeResults.filter((r) => r.blocked || r.status !== 200).length,
    avgWallMs: Math.round(crawleeResults.reduce((s, r) => s + r.wallMs, 0) / crawleeResults.length),
  };
  writeFileSync(CRAWLEE_JSON, `${JSON.stringify(crawleePayload, null, 2)}\n`, 'utf-8');

  const scraplingPayload = runScraplingArm();
  const decision = decideWinner(crawleePayload, scraplingPayload);

  const md = `# Crawlee vs Scrapling HTTP Compare (D-15-03)

**Date:** ${new Date().toISOString().slice(0, 10)}
**Overall winner:** **${decision.winner}**
**Reason:** ${decision.reason}

## Proxy

${proxyUrl ? '- Proxy configured via env (URL masked)' : '- **WARNING:** No proxy — dev/local direct fetch.'}

## Summary

| Arm | Block resistance | Speed | All pass | Avg wall ms |
|-----|------------------|-------|----------|-------------|
| Crawlee / got-scraping | ${decision.crawleeSummary.blockResistance} | ${decision.crawleeSummary.speed} | ${decision.crawleeSummary.allPass ? '✓' : '✗'} | ${decision.crawleeSummary.avgWallMs} |
| Scrapling Fetcher | ${decision.scraplingSummary.blockResistance} | ${decision.scraplingSummary.speed} | ${decision.scraplingSummary.allPass ? '✓' : '✗'} | ${decision.scraplingSummary.avgWallMs} |

**D-15-03 axes:** Scrapling block win = ${decision.scraplingWinsBlock ? 'yes' : 'no'}; Scrapling speed win (strictly faster all 3) = ${decision.scraplingWinsSpeed ? 'yes' : 'no'}

## Per-URL timing (ms)

| URL | Crawlee ms | Scrapling ms | Faster | Crawlee pass | Scrapling pass |
|-----|------------|--------------|--------|--------------|----------------|
${renderSideBySide(crawleePayload, scraplingPayload)}

## Crawlee / got-scraping detail

| Label | Status | Wall ms | Blocked | Listings | Fields OK | Pass |
|-------|--------|---------|---------|----------|-----------|------|
${renderTable(crawleePayload.results)}

## Scrapling Fetcher detail

| Label | Status | Wall ms | Blocked | Listings | Fields OK | Pass |
|-------|--------|---------|---------|----------|-----------|------|
${renderTable(scraplingPayload.results)}

## Errors

### Crawlee
${crawleePayload.results.filter((r) => r.error).length === 0 ? 'None.' : crawleePayload.results.filter((r) => r.error).map((r) => `- **${r.label}:** ${r.error}`).join('\n')}

### Scrapling
${scraplingPayload.results.filter((r) => r.error).length === 0 ? 'None.' : scraplingPayload.results.filter((r) => r.error).map((r) => `- **${r.label}:** ${r.error}`).join('\n')}

## Artifacts

- \`15-SPIKE-CRAWLEE.json\`
- \`15-SPIKE-SCRAPLING.json\`

---
*Generated by scraper/scripts/spike-subito-http-compare.mjs*
`;

  writeFileSync(COMPARE_MD, md, 'utf-8');
  console.log(`\n=== WINNER: ${decision.winner} ===`);
  console.log(decision.reason);
  console.log(`Wrote ${COMPARE_MD}`);

  process.exit(decision.winner.startsWith('Neither') ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
