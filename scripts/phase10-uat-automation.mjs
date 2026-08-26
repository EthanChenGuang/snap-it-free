#!/usr/bin/env node
/**
 * Phase 10 autonomous UAT — filter sheet, pills, map/radius mode, select-location.
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase10-uat-automation.mjs
 */
import { chromium } from '../scraper/node_modules/playwright/index.mjs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3003';
const FEED_SCROLLER = '.feed-home-scroll';
const FILTER_PREFS_KEY = 'shoumanwu_filter_prefs';
const BROWSE_CENTER_KEY = 'shoumanwu_browse_center';

function loadEnv(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const [k, ...rest] = t.split('=');
      out[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const local = loadEnv(resolve(root, '.env.local'));
const scraper = loadEnv(resolve(root, 'scraper/.env'));
const url = local.NEXT_PUBLIC_SUPABASE_URL || scraper.SUPABASE_URL;
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY ?? scraper.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { listings: [] };

function record(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} [${id}] ${name}${detail ? `: ${detail}` : ''}`);
}

function veniceListing(overrides = {}) {
  const id = randomUUID();
  const now = new Date();
  return {
    id,
    source: 'ugc',
    external_id: id,
    title: overrides.title ?? `P10 Venice ${id.slice(0, 8)}`,
    photo_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    external_url: `/listing/${id}`,
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
    ...overrides,
  };
}

function padovaListing(overrides = {}) {
  return veniceListing({
    title: overrides.title ?? `P10 Padova ${randomUUID().slice(0, 8)}`,
    lat: 45.41,
    lng: 11.88,
    geom: 'SRID=4326;POINT(11.88 45.41)',
    zone: null,
    city: 'Padova',
    ...overrides,
  });
}

async function seedListings(rows) {
  const { error } = await admin.from('listings').insert(rows);
  if (error) throw error;
  for (const row of rows) cleanup.listings.push(row.id);
  return rows;
}

async function cleanupAll() {
  for (const listingId of cleanup.listings) {
    await admin.from('listings').delete().eq('id', listingId);
  }
}

async function readFilterPrefs(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  }, FILTER_PREFS_KEY);
}

async function readBrowseCenter(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  }, BROWSE_CENTER_KEY);
}

async function clearClientState(page) {
  await page.evaluate(
    (keys) => {
      for (const key of keys) localStorage.removeItem(key);
    },
    [FILTER_PREFS_KEY, BROWSE_CENTER_KEY],
  );
}

async function countGridCards(page) {
  return page.locator('section.grid.grid-cols-2 > *').count();
}

async function waitForSheetClosed(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-vaul-drawer][data-state="open"]'),
    undefined,
    { timeout: 5000 },
  ).catch(() => {});
}

async function openFilterSheet(page) {
  await waitForSheetClosed(page);
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('dialog').filter({ hasText: 'Filters' }).waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(400);
}

async function closeFilterSheetWithoutApply(page) {
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('section.grid.grid-cols-2').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

async function main() {
  console.log(`=== Phase 10 Autonomous UAT (${BASE}) ===\n`);

  const venice = veniceListing({ title: 'P10UAT Venice unique item' });
  const padova = padovaListing({ title: 'P10UAT Padova unique item' });
  await seedListings([venice, padova]);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await clearClientState(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('section.grid.grid-cols-2 > *').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});

  async function narrowToP10Uat() {
    const search = page.getByRole('searchbox');
    await search.click();
    await search.fill('P10UAT');
    await page.waitForTimeout(500);
  }

  // Clear stale UAT listings from prior runs
  await admin.from('listings').delete().ilike('title', 'P10UAT%');

  // Test 1 — Filter sheet draft / Apply / Reset (city mode; radius on select-location per quick task)
  await narrowToP10Uat();
  const countBefore = await countGridCards(page);
  const veniceVisibleBefore = await page.getByText('P10UAT Venice unique item').isVisible().catch(() => false);
  const padovaVisibleBefore = await page.getByText('P10UAT Padova unique item').isVisible().catch(() => false);

  await openFilterSheet(page);
  await page.getByRole('button', { name: 'Padova', exact: true }).click({ force: true });
  await closeFilterSheetWithoutApply(page);

  const prefsAfterDismiss = await readFilterPrefs(page);
  const draftDiscarded = (prefsAfterDismiss?.city ?? 'all') === 'all';

  await openFilterSheet(page);
  const padovaBtn = page.getByRole('button', { name: 'Padova', exact: true });
  const padovaStillUnselected = !(await padovaBtn.evaluate((el) => el.className.includes('bg-primary')).catch(() => false));
  await closeFilterSheetWithoutApply(page);

  await openFilterSheet(page);
  await page.getByRole('button', { name: 'Padova', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Apply', exact: true }).click({ force: true });
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('shoumanwu_filter_prefs') || '{}').city === 'padova',
    undefined,
    { timeout: 10000 },
  );
  await waitForSheetClosed(page);

  const prefsAfterApply = await readFilterPrefs(page);
  const padovaOnlyAfterApply =
    prefsAfterApply?.mode === 'city' && prefsAfterApply?.city === 'padova';

  await openFilterSheet(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click({ force: true });
  await page.waitForFunction(
    () => {
      const prefs = JSON.parse(localStorage.getItem('shoumanwu_filter_prefs') || '{}');
      return prefs.city === 'all' && prefs.radiusEnabled === false;
    },
    undefined,
    { timeout: 10000 },
  );

  const prefsAfterReset = await readFilterPrefs(page);
  const browseAfterReset = await readBrowseCenter(page);
  const resetOk =
    (prefsAfterReset?.city ?? 'all') === 'all' &&
    prefsAfterReset?.categories?.length === 0 &&
    prefsAfterReset?.radiusEnabled === false &&
    browseAfterReset === null;

  record(
    1,
    'Filter sheet draft/Apply/Reset flow',
    draftDiscarded && padovaStillUnselected && padovaOnlyAfterApply && resetOk,
    `dismiss=${draftDiscarded} draftUi=${padovaStillUnselected} apply=${padovaOnlyAfterApply} reset=${resetOk}`,
  );

  // Test 2 — Active filter pills (search + categories; city/radius via sheet/map pin per D-01 refactor)
  await admin.from('listings').delete().ilike('title', 'P10UAT%');
  await seedListings([
    veniceListing({ title: 'P10UAT Venice unique item' }),
    padovaListing({ title: 'P10UAT Padova unique item' }),
  ]);
  await clearClientState(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('P10UAT Venice unique item').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator(FEED_SCROLLER).first().evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(300);

  const searchInput = page.locator('input[type="search"]');
  await searchInput.click({ force: true });
  await searchInput.fill('P10UAT Venice');
  await page.waitForTimeout(500);
  const searchInputOk = (await searchInput.inputValue()) === 'P10UAT Venice';
  const searchPillVisible = await page
    .getByRole('button', { name: 'Remove search filter' })
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  const veniceCount = await page.getByText('P10UAT Venice unique item').count();
  const padovaCount = await page.getByText('P10UAT Padova unique item').count();
  const gridCount = await page.locator('section.grid.grid-cols-2 > *').count();
  const searchFilteringOk = searchPillVisible && gridCount >= 1 && padovaCount === 0;

  await openFilterSheet(page);
  const firstCategory = page
    .getByRole('dialog')
    .locator('section .grid.grid-cols-3 button[aria-pressed]')
    .nth(1);
  await firstCategory.click({ force: true });
  await page.getByRole('button', { name: 'Apply', exact: true }).click({ force: true });
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('shoumanwu_filter_prefs') || '{}').categories?.length > 0,
    undefined,
    { timeout: 10000 },
  );

  const categoryPillVisible = await page
    .locator('header .flex.flex-wrap.gap-space-sm button')
    .filter({ hasNot: page.getByText('P10UAT') })
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  const pillWrap = page.locator('header .flex.flex-wrap.gap-space-sm').first();
  const hasFlexWrap = await pillWrap.evaluate((el) => getComputedStyle(el).flexWrap === 'wrap').catch(() => false);

  if (searchPillVisible) {
    await page.getByRole('button', { name: 'Remove search filter' }).click();
  } else if (searchInputOk) {
    await searchInput.fill('');
  }
  const searchCleared = (await searchInput.inputValue()) === '';

  const categoryDismissBtn = page.locator('header .flex.flex-wrap.gap-space-sm button').first();
  if (await categoryDismissBtn.isVisible().catch(() => false)) {
    await categoryDismissBtn.click();
  }
  const prefsAfterPillDismiss = await readFilterPrefs(page);
  const categoriesCleared = prefsAfterPillDismiss?.categories?.length === 0;

  record(
    2,
    'Active filter pills dismiss',
    searchFilteringOk && categoryPillVisible && hasFlexWrap && searchCleared && categoriesCleared,
    `searchFilter=${searchFilteringOk} grid=${gridCount} venice=${veniceCount} padova=${padovaCount} searchPill=${searchPillVisible} catPill=${categoryPillVisible}`,
  );

  // Test 3 — Select-location confirm → map mode + browse center (center pill moved to map pin indicator)
  await clearClientState(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('section.grid.grid-cols-2 > *').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});

  await page.getByRole('link', { name: 'Choose browse location' }).click();
  await page.waitForURL(/\/select-location/, { timeout: 15000 });
  await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const radius50 = page.getByRole('button', { name: '50 km' });
  if (await radius50.isVisible().catch(() => false)) {
    await radius50.click();
  }
  await page.getByRole('button', { name: /Confirm location/i }).click();
  await page.waitForURL(/\/$/, { timeout: 15000 });

  const prefsAfterConfirm = await readFilterPrefs(page);
  const centerAfterConfirm = await readBrowseCenter(page);
  const mapModeOk =
    prefsAfterConfirm?.mode === 'map' &&
    prefsAfterConfirm?.radiusEnabled === true &&
    centerAfterConfirm &&
    typeof centerAfterConfirm.lat === 'number';

  const pinIndicator = page.locator('a[aria-label="Choose browse location"] span.bg-error.rounded-full');
  const pinDotVisible = await pinIndicator.isVisible().catch(() => false);

  await openFilterSheet(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click({ force: true });
  await page.waitForFunction(
    () => {
      const prefs = JSON.parse(localStorage.getItem('shoumanwu_filter_prefs') || '{}');
      return prefs.mode === 'city' && prefs.radiusEnabled === false;
    },
    undefined,
    { timeout: 10000 },
  );
  const prefsAfterMapReset = await readFilterPrefs(page);
  const centerAfterMapReset = await readBrowseCenter(page);
  const clearMapOk =
    prefsAfterMapReset?.mode === 'city' &&
    prefsAfterMapReset?.radiusEnabled === false &&
    centerAfterMapReset === null;

  record(
    3,
    'Map pin mode + select-location confirm',
    mapModeOk && pinDotVisible && clearMapOk,
    `mapMode=${mapModeOk} pinDot=${pinDotVisible} resetClear=${clearMapOk}`,
  );

  // Test 4 — Drawer height vs bottom nav
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await openFilterSheet(page);
  const drawer = page.locator('[data-vaul-drawer]').first();
  await drawer.waitFor({ state: 'visible', timeout: 5000 });
  const drawerMetrics = await drawer.evaluate((el) => {
    const style = getComputedStyle(el);
    const maxH = style.maxHeight;
    const rect = el.getBoundingClientRect();
    return { maxH, height: rect.height, viewport: window.innerHeight };
  });
  const maxHOk =
    drawerMetrics.maxH.includes('85vh') ||
    drawerMetrics.height <= drawerMetrics.viewport * 0.9;
  const footerVisible = await page.getByRole('button', { name: 'Apply', exact: true }).isVisible();
  const resetVisible = await page.getByRole('button', { name: 'Reset', exact: true }).isVisible();
  const bottomNavVisible = await page.locator('nav a[href="/"]').isVisible();

  await closeFilterSheetWithoutApply(page);

  record(
    4,
    'Drawer height vs bottom nav',
    maxHOk && footerVisible && resetVisible && bottomNavVisible,
    `maxH=${drawerMetrics.maxH} h=${Math.round(drawerMetrics.height)} footer=${footerVisible} nav=${bottomNavVisible}`,
  );

  await browser.close();

  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log(`${passed}/${results.length} passed`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => `[${f.id}] ${f.name}: ${f.detail}`).join('; '));
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  })
  .finally(() => cleanupAll());
