// Recon for quick task 260803-whr: find the narrowest Venice-scoped regalo URL form
// and discover where location / coordinates actually live on current detail pages.
//
// Run: cd scraper && node --import tsx scripts/spike-subito-geo.mjs
//
// V8 minimization: prints counts, coordinate sources and municipality strings only.
// Never extracts seller name, phone, email or chat handles.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadZonePolygons, tagZone } from '../src/shared/zone-tag.js';

const CENTROIDS = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../src/geo/municipality-centroids.json'),
    'utf-8',
  ),
).sort((a, b) => b.name.length - a.name.length);

const CATEGORIES = ['arredamento-casalinghi', 'elettrodomestici', 'bambini-giocattoli'];

const CANDIDATE_FORMS = [
  {
    label: 'A-veneto-region (current production form)',
    build: (c) => `https://www.subito.it/annunci-veneto/regalo/${c}/`,
  },
  {
    label: 'B-veneto+provincia-venezia',
    build: (c) => `https://www.subito.it/annunci-veneto/regalo/${c}/venezia/`,
  },
  {
    label: 'C-veneto+provincia+comune-venezia',
    build: (c) => `https://www.subito.it/annunci-veneto/regalo/${c}/venezia/venezia/`,
  },
  {
    label: 'D-annunci-venezia-as-region-segment',
    build: (c) => `https://www.subito.it/annunci-venezia/regalo/${c}/`,
  },
  {
    label: 'E-veneto-region + location query param',
    build: (c) => `https://www.subito.it/annunci-veneto/regalo/${c}/?rs=Venezia`,
  },
];

const VENETO_PROVINCE_CODES = ['VE', 'PD', 'TV', 'VR', 'VI', 'RO', 'BL'];
const PROVINCE_RE = new RegExp(
  `([A-ZÀ-Ý][\\p{L}'’.\\- ]{1,40}?)\\s*\\((${VENETO_PROVINCE_CODES.join('|')})\\)`,
  'u',
);
const PROVINCE_RE_G = new RegExp(PROVINCE_RE.source, 'gu');

const VENICE_LAT_MIN = 45.0;
const VENICE_LAT_MAX = 45.7;
const VENICE_LNG_MIN = 12.1;
const VENICE_LNG_MAX = 12.6;

const zones = loadZonePolygons();

function inVeniceBbox(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VENICE_LAT_MIN &&
    lat <= VENICE_LAT_MAX &&
    lng >= VENICE_LNG_MIN &&
    lng <= VENICE_LNG_MAX
  );
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

// ---------------------------------------------------------------- Part A

async function probeCandidate(page, url) {
  const out = { url, finalUrl: url, status: 0, anchors: 0, uniqueHrefs: 0, towns: [], error: null };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    out.status = resp?.status() ?? 0;
    await dismissCookieBanner(page);
    await page.waitForSelector('article a[href*=".htm"]', { timeout: 20000 }).catch(() => {});
    out.finalUrl = page.url();
    const hrefs = await page
      .locator('article a[href*=".htm"]')
      .evaluateAll((links) =>
        links.map((l) => l.getAttribute('href')).filter((h) => Boolean(h)),
      );
    out.anchors = hrefs.length;
    out.uniqueHrefs = new Set(hrefs).size;
    const articleTexts = await page
      .locator('article')
      .evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
    out.towns = articleTexts
      .map((t) => t.match(PROVINCE_RE))
      .filter(Boolean)
      .map((m) => `${m[1].trim()} (${m[2]})`);
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
  }
  return out;
}

function summariseTowns(towns) {
  const counts = new Map();
  for (const t of towns) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t}x${n}`)
    .join(', ');
}

// ---------------------------------------------------------------- Part B

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
  const m = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );
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
      const parsed = JSON.parse(b[1]);
      const hit = walkForCoords(parsed);
      if (hit) return hit;
    } catch {
      /* malformed block — ignore */
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

// Last-resort source: the municipality centroid implied by the location string.
// Longest name first so a locality beats the comune-wide name.
function fromCentroid(locationText) {
  if (!locationText) return null;
  const normalized = locationText.toLowerCase();
  for (const entry of CENTROIDS) {
    if (normalized.includes(entry.name.toLowerCase())) {
      return { lat: entry.lat, lng: entry.lng, matched: entry.name };
    }
  }
  return null;
}

async function probeDetail(page, url) {
  const row = {
    url,
    lat: null,
    lng: null,
    source: 'none',
    rejected: [],
    locationText: '',
    locationSource: 'none',
    bodyTowns: [],
  };

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissCookieBanner(page);
  await page.waitForTimeout(1500);
  const html = await page.content();

  for (const src of COORD_SOURCES) {
    const hit = src.fn(html);
    if (!hit) continue;
    if (!inVeniceBbox(hit.lat, hit.lng)) {
      row.rejected.push(`${src.name}(${hit.lat},${hit.lng})`);
      continue;
    }
    row.lat = hit.lat;
    row.lng = hit.lng;
    row.source = src.name;
    break;
  }

  const loc = await page.evaluate(() => {
    const txt = (el) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const candidates = [
      ['span-caption', txt(document.querySelector('span[class*="caption"]'))],
      ['class-location', txt(document.querySelector('[class*="location"]'))],
      ['testid-location', txt(document.querySelector('[data-testid*="location"]'))],
      ['class-AdInfo', txt(document.querySelector('[class*="AdInfo"]'))],
      ['class-city', txt(document.querySelector('[class*="city"]'))],
      [
        'breadcrumb',
        [...document.querySelectorAll('nav[class*="readcrumb"] a, [class*="readcrumb"] a, ol li a')]
          .map((a) => a.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' > '),
      ],
    ];
    return { candidates, bodyText: (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 6000) };
  });

  row.allCandidates = loc.candidates.map(([n, v]) => `${n}="${(v ?? '').slice(0, 60)}"`);

  for (const [name, value] of loc.candidates) {
    if (value && PROVINCE_RE.test(value)) {
      row.locationText = value.slice(0, 120);
      row.locationSource = name;
      break;
    }
  }
  row.bodyTowns = [...new Set([...loc.bodyText.matchAll(PROVINCE_RE_G)].map((m) => `${m[1].trim()} (${m[2]})`))].slice(0, 4);

  if (!row.locationText && row.bodyTowns.length > 0) {
    row.locationText = row.bodyTowns[0];
    row.locationSource = 'body-scan';
  }

  // No page-embedded coordinates were found — fall back to the municipality centroid.
  if (row.lat == null) {
    const c = fromCentroid(row.locationText);
    if (c && inVeniceBbox(c.lat, c.lng)) {
      row.lat = c.lat;
      row.lng = c.lng;
      row.source = `centroid:${c.matched}`;
    }
  }

  row.zone = row.lat != null && row.lng != null ? tagZone(row.lat, row.lng, zones) : null;

  console.log(
    `page=${url.split('/').pop()} lat=${row.lat ?? 'null'} lng=${row.lng ?? 'null'} ` +
      `source=${row.source} rejected=[${row.rejected.join(' ')}] ` +
      `location="${row.locationText}" locationSource=${row.locationSource} ` +
      `bodyTowns=[${row.bodyTowns.join(' | ')}] zone=${row.zone ?? 'null'}`,
  );
  console.log(`  locationCandidates: ${row.allCandidates.join(' ')}`);

  return row;
}

// ---------------------------------------------------------------- main

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'it-IT' });
const page = await context.newPage();

console.log('=== PART A: Venice-scoped URL form probe ===');
const results = [];
for (const form of CANDIDATE_FORMS) {
  for (const cat of CATEGORIES) {
    const r = await probeCandidate(page, form.build(cat));
    r.form = form.label;
    r.category = cat;
    results.push(r);
    console.log(
      `form=${form.label} cat=${cat} status=${r.status} anchors=${r.anchors} ` +
        `uniqueHrefs=${r.uniqueHrefs} final=${r.finalUrl}${r.error ? ` error=${r.error}` : ''}`,
    );
    console.log(`  towns: ${summariseTowns(r.towns) || '(none parsed)'}`);
  }
}

console.log('\n=== PART A: per-form totals ===');
const byForm = new Map();
for (const r of results) {
  const agg = byForm.get(r.form) ?? { cards: 0, ve: 0, towns: 0, ok: 0, minCat: Infinity };
  agg.cards += r.uniqueHrefs;
  agg.towns += r.towns.length;
  agg.ve += r.towns.filter((t) => t.endsWith('(VE)')).length;
  agg.ok += r.status === 200 ? 1 : 0;
  agg.minCat = Math.min(agg.minCat, r.uniqueHrefs);
  byForm.set(r.form, agg);
}
for (const [form, agg] of byForm) {
  const pct = agg.towns > 0 ? Math.round((agg.ve / agg.towns) * 100) : 0;
  console.log(
    `${form}: cards=${agg.cards} minPerCategory=${agg.minCat} http200=${agg.ok}/3 ` +
      `towns=${agg.towns} inVE=${agg.ve} (${pct}%)`,
  );
}

// Winner: the NARROWEST form that is still usable — every category must return cards and
// the run must total a usable number, then prefer the highest in-Venice share and, on a
// tie, the tighter (smaller) result set.
const WINNER_LABEL = process.env.WINNER_FORM ?? pickWinner();

function pickWinner() {
  let best = null;
  for (const [form, agg] of byForm) {
    if (agg.ok < 3 || agg.minCat < 1 || agg.cards < 20) continue;
    const pct = agg.towns > 0 ? agg.ve / agg.towns : 0;
    if (!best || pct > best.pct || (pct === best.pct && agg.cards < best.cards)) {
      best = { form, pct, cards: agg.cards };
    }
  }
  return best?.form ?? CANDIDATE_FORMS[0].label;
}

console.log(`\n=== WINNING FORM: ${WINNER_LABEL} ===`);
const winnerUrls = results.filter((r) => r.form === WINNER_LABEL).map((r) => r.finalUrl);
console.log(winnerUrls.join('\n'));

console.log('\n=== PART B: coordinate + location sources on 6 detail pages ===');
const detailUrls = [];
for (const url of winnerUrls) {
  if (detailUrls.length >= 6) break;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissCookieBanner(page);
  await page.waitForSelector('article a[href*=".htm"]', { timeout: 20000 }).catch(() => {});
  const hrefs = await page
    .locator('article a[href*=".htm"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('href')).filter(Boolean));
  for (const href of [...new Set(hrefs)]) {
    if (detailUrls.length >= 6) break;
    detailUrls.push(href.startsWith('http') ? href : `https://www.subito.it${href}`);
  }
}

const rows = [];
for (const url of detailUrls) {
  try {
    rows.push(await probeDetail(page, url));
  } catch (err) {
    console.log(`page=${url} source=error error=${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log('\n=== PART B: totals ===');
const bySource = new Map();
for (const r of rows) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
console.log(`pages=${rows.length}`);
console.log(`coordSources: ${[...bySource.entries()].map(([s, n]) => `${s}=${n}`).join(', ')}`);
console.log(`withCoords=${rows.filter((r) => r.lat != null).length}/${rows.length}`);
console.log(`withZone=${rows.filter((r) => r.zone).length}/${rows.length}`);
console.log(`withLocationText=${rows.filter((r) => r.locationText).length}/${rows.length}`);
const locSources = new Map();
for (const r of rows) locSources.set(r.locationSource, (locSources.get(r.locationSource) ?? 0) + 1);
console.log(`locationSources: ${[...locSources.entries()].map(([s, n]) => `${s}=${n}`).join(', ')}`);

await browser.close();
