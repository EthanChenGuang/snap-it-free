#!/usr/bin/env node
/**
 * Dev verification for /select-location — chunk integrity + Playwright UAT test 7 (G-09-7).
 *
 * Prerequisites:
 * - Dev server running: PORT=3003 npm run dev
 * - Restart dev after code changes; if chunk probe reports TRUNC, delete .next and restart once.
 *
 * Usage:
 *   E2E_BASE_URL=http://localhost:3003 node scripts/verify-select-location-dev.mjs
 *   E2E_BASE_URL=http://localhost:3003 node scripts/verify-select-location-dev.mjs --browser
 */
import { chromium } from '../scraper/node_modules/playwright/index.mjs';

const BROWSE_CENTER_STORAGE_KEY = 'shoumanwu_browse_center';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3003';
const runBrowser = process.argv.includes('--browser');
const consoleErrors = [];
const ZONE_LABELS = /Centro|Historic Center|历史中心|Mestre|Lido|Padova|Padova/i;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function extractChunkUrls(html, baseUrl) {
  const urls = new Set();
  const scriptSrc = [...html.matchAll(/\bsrc="([^"]*_next\/static\/chunks\/[^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  for (const src of scriptSrc) {
    urls.add(new URL(src, baseUrl).href);
  }
  return [...urls];
}

async function fetchChunk(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const declared = Number(res.headers.get('content-length') ?? buf.length);
  const actual = buf.length;
  const truncated = declared > 0 && actual < declared;
  return { url, declared, actual, truncated, ok: res.ok };
}

async function runChunkProbe() {
  const pageUrl = `${BASE}/select-location`;
  let htmlRes;
  try {
    htmlRes = await fetch(pageUrl);
  } catch (err) {
    fail(`Cannot reach ${pageUrl} — start dev server (PORT=3003 npm run dev). ${err.message}`);
  }
  if (!htmlRes.ok) {
    fail(`GET ${pageUrl} returned ${htmlRes.status}`);
  }
  const html = await htmlRes.text();
  const chunkUrls = extractChunkUrls(html, pageUrl);
  if (chunkUrls.length === 0) {
    fail('No _next/static/chunks/*.js URLs found in /select-location HTML');
  }

  const results = await Promise.all(chunkUrls.map(fetchChunk));
  const truncated = results.filter((r) => r.truncated);
  for (const r of results) {
    const status = r.truncated ? 'TRUNC' : 'OK';
    console.log(`${status} ${r.url} declared=${r.declared} actual=${r.actual}`);
  }
  if (truncated.length > 0) {
    fail(`${truncated.length} truncated chunk(s) on /select-location — delete .next and restart dev`);
  }
  pass(`chunk probe (${results.length} chunks, no truncation)`);
}

async function runBrowserChecks() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('Invalid or unexpected token') ||
      text.includes("Can't perform a React state update on a component that hasn't mounted yet")
    ) {
      consoleErrors.push(text);
    }
  });

  try {
    await page.goto(`${BASE}/select-location`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const loadingText = page.getByText('地图加载中…');
    const confirmBtn = page.getByRole('button', {
      name: /Confirm location|确认位置|Conferma posizione/i,
    });
    const canvas = page.locator('.maplibregl-canvas');

    await Promise.race([
      canvas.waitFor({ state: 'visible', timeout: 15000 }),
      confirmBtn.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {
      fail('Map canvas / Confirm button not visible within 15s on /select-location');
    });

    if (await loadingText.isVisible().catch(() => false)) {
      fail('Still showing map loading fallback after 15s');
    }

    const zoneChip = page.getByRole('button').filter({ hasText: ZONE_LABELS }).first();
    await zoneChip.waitFor({ state: 'visible', timeout: 5000 });

    const pinOverlay = page.locator('div.pointer-events-none[aria-hidden="true"]');
    await pinOverlay.waitFor({ state: 'visible', timeout: 5000 });

    await confirmBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', undefined, {
      timeout: 15000,
    });

    const stored = await page.evaluate(
      (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      },
      BROWSE_CENTER_STORAGE_KEY,
    );

    if (
      !stored ||
      typeof stored.lat !== 'number' ||
      typeof stored.lng !== 'number' ||
      !Number.isFinite(stored.lat) ||
      !Number.isFinite(stored.lng) ||
      stored.lat < -90 ||
      stored.lat > 90 ||
      stored.lng < -180 ||
      stored.lng > 180
    ) {
      fail(`localStorage ${BROWSE_CENTER_STORAGE_KEY} missing or invalid after Confirm`);
    }

    if (consoleErrors.length > 0) {
      fail(`Console errors: ${consoleErrors.join(' | ')}`);
    }

    pass('Playwright UAT test 7 — map, zone chips, Confirm → / + browse center');
  } finally {
    await browser.close();
  }
}

async function main() {
  await runChunkProbe();
  if (runBrowser) {
    await runBrowserChecks();
  }
  console.log(
    runBrowser
      ? 'PASS: select-location dev verification (chunks + browser)'
      : 'PASS: select-location chunk probe',
  );
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});
