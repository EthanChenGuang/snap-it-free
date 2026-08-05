// D-15 Padova spike gate — verify padova/padova regalo URLs return listings + coords.
//
// Run: node scraper/scripts/spike-subito-padova.mjs
// (from repo root; uses Playwright headless Chromium — no curl-only probes)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SLUGS = ['informatica', 'arredamento-casalinghi', 'usato'];
const BASE = 'https://www.subito.it/annunci-veneto/regalo';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPIKE_MD = join(
  REPO_ROOT,
  '.planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-PADOVA-SPIKE.md',
);

// Fallback Padova bbox (RESEARCH Assumption A2) — refined from samples when coords found
let PADOVA_LAT_MIN = 45.3;
let PADOVA_LAT_MAX = 45.5;
let PADOVA_LNG_MIN = 11.7;
let PADOVA_LNG_MAX = 12.0;

function inPadovaBbox(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= PADOVA_LAT_MIN &&
    lat <= PADOVA_LAT_MAX &&
    lng >= PADOVA_LNG_MIN &&
    lng <= PADOVA_LNG_MAX
  );
}

function deriveBboxFromSamples(samples) {
  if (samples.length === 0) return;
  const lats = samples.map((s) => s.lat);
  const lngs = samples.map((s) => s.lng);
  const pad = 0.1;
  PADOVA_LAT_MIN = Math.min(...lats) - pad;
  PADOVA_LAT_MAX = Math.max(...lats) + pad;
  PADOVA_LNG_MIN = Math.min(...lngs) - pad;
  PADOVA_LNG_MAX = Math.max(...lngs) + pad;
}

async function dismissCookieBanner(page) {
  const accept = page.locator('#didomi-notice-agree-button, button:has-text("Accetta")');
  if ((await accept.count()) > 0) {
    await accept
      .first()
      .click({ timeout: 3000 })
      .catch(() => {});
    await page.waitForTimeout(500);
  }
}

function walkForCoords(node, depth = 0) {
  if (node == null || depth > 12) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = walkForCoords(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const keys = Object.keys(node);
  const latKey = keys.find((k) => /^(lat|latitude|latitudine)$/i.test(k));
  const lngKey = keys.find((k) => /^(lng|lon|long|longitude|longitudine)$/i.test(k));
  if (latKey && lngKey) {
    const lat = Number.parseFloat(node[latKey]);
    const lng = Number.parseFloat(node[lngKey]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  for (const k of keys) {
    const hit = walkForCoords(node[k], depth + 1);
    if (hit) return hit;
  }
  return null;
}

function fromNextData(html) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return walkForCoords(JSON.parse(m[1]));
  } catch {
    return null;
  }
}

function fromLdJson(html) {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    try {
      const hit = walkForCoords(JSON.parse(b[1]));
      if (hit) return hit;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function fromRawHtml(html) {
  const latM =
    html.match(/"?(?:latitude|latitudine)"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i) ??
    html.match(/"?lat"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i);
  const lngM =
    html.match(/"?(?:longitude|longitudine)"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i) ??
    html.match(/"?(?:lng|lon|long)"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i);
  if (!latM || !lngM) return null;
  const lat = Number.parseFloat(latM[1]);
  const lng = Number.parseFloat(lngM[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function fromMapUrl(html) {
  const m =
    html.match(/maps\.google[^"'\s]*?[?&](?:q|center|ll)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i) ??
    html.match(/(?:staticmap|maps\/api)[^"'\s]*?[?&](?:center|markers)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
  if (!m) return null;
  const lat = Number.parseFloat(m[1]);
  const lng = Number.parseFloat(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

const COORD_SOURCES = [
  { name: 'next-data', fn: fromNextData },
  { name: 'ld-json', fn: fromLdJson },
  { name: 'raw-html', fn: fromRawHtml },
  { name: 'map-url', fn: fromMapUrl },
];

/** Mirrors extract.ts resolveCoords embedded-coord path (no centroid fallback per D-24). */
function resolveEmbeddedCoords(html) {
  for (const src of COORD_SOURCES) {
    const hit = src.fn(html);
    if (hit) return { lat: hit.lat, lng: hit.lng, source: src.name };
  }
  return { lat: null, lng: null, source: 'none' };
}

async function probeCategoryPage(page, slug) {
  const url = `${BASE}/${slug}/padova/padova/`;
  const row = {
    slug,
    url,
    status: 0,
    title: '',
    blocked: false,
    articleCount: 0,
    sampleDetailUrl: null,
    pass: false,
    error: null,
  };

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    row.status = resp?.status() ?? 0;
    await dismissCookieBanner(page);
    row.title = await page.title();
    row.blocked = row.title.toLowerCase().includes('blocked');

    await page.waitForSelector('article a[href*=".htm"]', { timeout: 20000 }).catch(() => {});
    const hrefs = await page
      .locator('article a[href*=".htm"]')
      .evaluateAll((links) =>
        links.map((l) => l.getAttribute('href')).filter((h) => Boolean(h)),
      );
    row.articleCount = hrefs.length;
    if (hrefs.length > 0) {
      const href = hrefs[0];
      row.sampleDetailUrl = href.startsWith('http') ? href : `https://www.subito.it${href}`;
    }

    row.pass = row.status === 200 && !row.blocked && row.articleCount >= 1;
  } catch (err) {
    row.error = err instanceof Error ? err.message : String(err);
  }

  console.log(
    `slug=${slug} status=${row.status} blocked=${row.blocked} articles=${row.articleCount} ` +
      `pass=${row.pass}${row.sampleDetailUrl ? ` sample=${row.sampleDetailUrl}` : ''}`,
  );
  return row;
}

async function probeDetailCoords(page, url) {
  const row = { url, lat: null, lng: null, source: 'none', inBbox: false, error: null };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dismissCookieBanner(page);
    await page.waitForTimeout(1500);
    const html = await page.content();
    const coords = resolveEmbeddedCoords(html);
    row.lat = coords.lat;
    row.lng = coords.lng;
    row.source = coords.source;
    if (row.lat != null && row.lng != null) {
      row.inBbox = inPadovaBbox(row.lat, row.lng);
    }
  } catch (err) {
    row.error = err instanceof Error ? err.message : String(err);
  }

  console.log(
    `detail=${url.split('/').pop()} lat=${row.lat ?? 'null'} lng=${row.lng ?? 'null'} ` +
      `source=${row.source} inBbox=${row.inBbox}`,
  );
  return row;
}

// ---------------------------------------------------------------- main

console.log('=== D-15 Padova spike gate ===');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'it-IT' });
const page = await context.newPage();

const categoryResults = [];
for (const slug of SLUGS) {
  categoryResults.push(await probeCategoryPage(page, slug));
}

const slugsPassing = categoryResults.filter((r) => r.pass).length;
const detailUrls = categoryResults
  .filter((r) => r.sampleDetailUrl)
  .map((r) => r.sampleDetailUrl)
  .slice(0, 2);

const detailResults = [];
for (const url of detailUrls) {
  detailResults.push(await probeDetailCoords(page, url));
}

await browser.close();

const coordSamples = detailResults.filter((d) => d.lat != null && d.lng != null);
deriveBboxFromSamples(coordSamples);

const coordsInBbox = detailResults.filter((d) => d.inBbox).length;
const categoryGate = slugsPassing >= 2;
const coordGate = coordsInBbox >= 1;
const verdict = categoryGate && coordGate ? 'PASS' : 'FAIL';

const md = `# Padova Spike Gate (D-15)

**Date:** ${new Date().toISOString().slice(0, 10)}
**Verdict:** ${verdict}

## Gate Criteria

| Check | Required | Result |
|-------|----------|--------|
| Category pages load (≥2/3 slugs) | ≥2/3 | ${slugsPassing}/3 |
| Detail coords in Padova bbox | ≥1 | ${coordsInBbox} |

## Recommended Bbox Constants

\`\`\`
PADOVA_LAT_MIN = ${PADOVA_LAT_MIN.toFixed(4)}
PADOVA_LAT_MAX = ${PADOVA_LAT_MAX.toFixed(4)}
PADOVA_LNG_MIN = ${PADOVA_LNG_MIN.toFixed(4)}
PADOVA_LNG_MAX = ${PADOVA_LNG_MAX.toFixed(4)}
\`\`\`

## Category Page Results

| Slug | Status | Blocked | Articles | Pass | Sample Detail |
|------|--------|---------|----------|------|---------------|
${categoryResults
  .map(
    (r) =>
      `| ${r.slug} | ${r.status} | ${r.blocked} | ${r.articleCount} | ${r.pass ? '✓' : '✗'} | ${r.sampleDetailUrl ?? '—'} |`,
  )
  .join('\n')}

## Detail Coordinate Results

| URL | Lat | Lng | Source | In Bbox |
|-----|-----|-----|--------|---------|
${detailResults
  .map(
    (d) =>
      `| ${d.url.split('/').pop()} | ${d.lat ?? 'null'} | ${d.lng ?? 'null'} | ${d.source} | ${d.inBbox ? '✓' : '✗'} |`,
  )
  .join('\n')}

## Downstream Impact

${verdict === 'PASS' ? 'Padova URLs may ship in recommended seed (Plan 04). Venice-only seed remains valid regardless.' : '**BLOCKER:** Padova URLs must NOT ship in recommended seed until spike re-run passes. Venice-only seed still allowed (D-15).'}

---
*Generated by scraper/scripts/spike-subito-padova.mjs*
`;

writeFileSync(SPIKE_MD, md, 'utf-8');
console.log(`\n=== VERDICT: ${verdict} ===`);
console.log(`Wrote ${SPIKE_MD}`);
console.log(
  `bbox: lat ${PADOVA_LAT_MIN.toFixed(4)}–${PADOVA_LAT_MAX.toFixed(4)}, ` +
    `lng ${PADOVA_LNG_MIN.toFixed(4)}–${PADOVA_LNG_MAX.toFixed(4)}`,
);

process.exit(0);
