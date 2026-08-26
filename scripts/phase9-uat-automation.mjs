#!/usr/bin/env node
/**
 * Phase 9 autonomous UAT — feed-first home, nav IA, select-location.
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase9-uat-automation.mjs
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
const NAV_POST = /Post|Pubblica/i;
const AUTH_MODAL = /Sign in to continue|Accedi per continuare|登录以继续/i;

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
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY ?? scraper.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { users: [], listings: [] };

function record(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} [${id}] ${name}${detail ? `: ${detail}` : ''}`);
}

async function createTestUser(label) {
  const email = `p9-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P9UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function passwordAuthCookies(email, password = 'P9UatPass123!') {
  const anon = createClient(url, anonKey);
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const sessionPayload = JSON.stringify({
    access_token: data.session.access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: data.session.refresh_token,
    user: data.session.user,
  });
  const projectRef = url.match(/https:\/\/([^.]+)/)?.[1];
  if (!projectRef) throw new Error('Could not parse Supabase project ref');
  return [
    {
      name: `sb-${projectRef}-auth-token`,
      value: `base64-${Buffer.from(sessionPayload).toString('base64')}`,
      domain: new URL(BASE).hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ];
}

function veniceListing(overrides = {}) {
  const id = randomUUID();
  const now = new Date();
  return {
    id,
    source: 'ugc',
    external_id: id,
    title: `P9 UAT listing ${id.slice(0, 8)}`,
    photo_url: 'https://example.com/uat.jpg',
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

async function seedListings(count = 6) {
  const rows = Array.from({ length: count }, (_, i) =>
    veniceListing({ title: `P9 scroll listing ${i + 1}` }),
  );
  const { error } = await admin.from('listings').insert(rows);
  if (error) throw error;
  for (const row of rows) cleanup.listings.push(row.id);
  return rows;
}

async function cleanupAll() {
  for (const listingId of cleanup.listings) {
    await admin.from('listings').delete().eq('id', listingId);
  }
  for (const userId of cleanup.users) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  console.log(`=== Phase 9 Autonomous UAT (${BASE}) ===\n`);

  const browser = await chromium.launch({ headless: true });
  const anonContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    locale: 'en-US',
  });
  const anonPage = await anonContext.newPage();

  // Test 1 — Feed grid at mobile width (not map home)
  await anonPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const mapCanvas = anonPage.locator('.maplibregl-canvas');
  const mapCount = await mapCanvas.count();
  const hasMap =
    mapCount > 0 && (await mapCanvas.first().isVisible().catch(() => false));
  const feedGrid = anonPage.locator('section.grid.grid-cols-2');
  const emptyState = anonPage.getByText(/No listings|暂无|Nessun/i);
  const isFeedHome = !hasMap && ((await feedGrid.count()) > 0 || (await emptyState.isVisible().catch(() => false)));
  record(1, 'Feed grid at mobile width', isFeedHome, hasMap ? 'MapLibre canvas on home' : 'feed-first home confirmed');

  // Test 2 — Post auth gate (logged out)
  await anonPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await anonPage.waitForTimeout(1500);
  await anonPage.locator('a[href="/post"]').click();
  const authModal = anonPage.getByRole('dialog');
  const modalVisible = await authModal.isVisible({ timeout: 10000 }).catch(() => false);
  const authText = modalVisible ? await authModal.innerText() : '';
  const authTextOk = /Sign in to continue|Accedi per continuare|登录以继续/i.test(authText);
  const stayedOnHome = new URL(anonPage.url()).pathname === '/';
  record(2, 'Post auth gate (logged out)', modalVisible && authTextOk && stayedOnHome, `modal=${modalVisible} url=${anonPage.url()}`);

  // Seed listings for scroll test
  await seedListings(8);

  // Test 3 — Scroll-away feed header
  await anonPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await anonPage.locator('section.grid.grid-cols-2 > *').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await anonPage.waitForTimeout(1000);
  const header = anonPage.locator('header.feed-header-glass');
  const headerVisibleBefore = await header.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.opacity !== '0' && style.maxHeight !== '0px';
  }).catch(() => true);

  const scroller = anonPage.locator(FEED_SCROLLER).first();
  await scroller.waitFor({ state: 'visible', timeout: 10000 });
  await scroller.evaluate(async (el) => {
    for (let top = 0; top <= 480; top += 40) {
      el.scrollTop = top;
      el.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await anonPage.waitForTimeout(500);
  const headerHiddenAfterScroll = await header.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.opacity === '0' || style.maxHeight === '0px' || el.className.includes('max-h-0');
  }).catch(() => false);

  await scroller.evaluate(async (el) => {
    for (let top = 320; top >= 0; top -= 40) {
      el.scrollTop = top;
      el.dispatchEvent(new Event('scroll'));
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await anonPage.waitForTimeout(400);
  const headerVisibleAfterScrollUp = await header.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.opacity !== '0';
  }).catch(() => false);

  const bottomNav = anonPage.locator('nav').filter({ has: anonPage.getByRole('link', { name: 'Home' }) });
  const navStillVisible = await bottomNav.isVisible().catch(() => false);
  record(
    3,
    'Scroll-away feed header',
    headerVisibleBefore && headerHiddenAfterScroll && headerVisibleAfterScrollUp && navStillVisible,
    `hide=${headerHiddenAfterScroll} restore=${headerVisibleAfterScrollUp} nav=${navStillVisible}`,
  );

  // Test 4 — Filter sheet opens (Phase 10 superseded toast stub)
  await anonPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await anonPage.getByRole('button', { name: /Filters|Filtri|筛选/i }).click();
  const filterSheet = anonPage.getByRole('dialog').filter({ hasText: /Filters|Filtri|筛选/i });
  const sheetVisible = await filterSheet.isVisible({ timeout: 5000 }).catch(() => false);
  record(4, 'Filter sheet opens from feed header', sheetVisible, sheetVisible ? 'filter drawer visible' : 'no sheet');

  // Test 6 — Settings chrome (logged out checks)
  await anonPage.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  const titleBar = anonPage.getByText('零元');
  const titleVisible = await titleBar.isVisible().catch(() => false);
  const manageLink = anonPage.getByRole('link', { name: /My listings|我的发布|I miei annunci/i });
  const manageHref = await manageLink.getAttribute('href').catch(() => null);
  const settingsLoggedOutPass = titleVisible && manageHref === '/post/manage';

  await anonContext.close();

  // Test 5 — Favorites 2-col grid (logged in)
  const user = await createTestUser('fav');
  const listing = veniceListing();
  const { error: insErr } = await admin.from('listings').insert(listing);
  if (insErr) throw insErr;
  cleanup.listings.push(listing.id);

  const { error: favInsErr } = await admin.from('user_favorites').insert({
    user_id: user.id,
    listing_id: listing.id,
  });
  if (favInsErr) throw favInsErr;

  const authContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await authContext.addCookies(await passwordAuthCookies(user.email));
  const authPage = await authContext.newPage();
  await authPage.goto(`${BASE}/favorites`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await authPage.waitForTimeout(3000);

  const refreshing = authPage.getByText(/刷新中|Refreshing/i);
  await refreshing.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});

  const favGrid = authPage.locator('section.grid.grid-cols-2');
  await favGrid.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const gridVisible = await favGrid.isVisible().catch(() => false);
  const heartBtn = authPage.locator('section.grid.grid-cols-2 button[aria-label="Favorites"]').first();
  await heartBtn.waitFor({ state: 'visible', timeout: 10000 });
  await authPage.waitForFunction(
    () =>
      document
        .querySelector('section.grid.grid-cols-2 button[aria-label="Favorites"]')
        ?.getAttribute('aria-pressed') === 'true',
    undefined,
    { timeout: 10000 },
  );
  const heartPressedBefore = 'true';
  await heartBtn.click();
  const unfavorited = await authPage
    .waitForFunction(
      () =>
        document
          .querySelector('section.grid.grid-cols-2 button[aria-label="Favorites"]')
          ?.getAttribute('aria-pressed') === 'false' ||
        document.querySelector('section.grid.grid-cols-2') === null,
      undefined,
      { timeout: 10000 },
    )
    .then(() => true)
    .catch(() => false);
  const removedToast = await authPage
    .getByText(/Removed from favorites|已从收藏|Rimosso/i)
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  record(
    5,
    'Favorites 2-col grid (logged in)',
    gridVisible && heartPressedBefore === 'true' && (unfavorited || removedToast),
    `grid=${gridVisible} unfavorited=${unfavorited} removedToast=${removedToast}`,
  );

  // Test 6b — manage-posts when signed in
  await authPage.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await authPage.getByRole('link', { name: /My listings|我的发布|I miei annunci/i }).click();
  await authPage.waitForURL(/\/post\/manage/, { timeout: 10000 });
  const settingsSignedInPass = /\/post\/manage/.test(authPage.url());

  record(
    6,
    'Settings chrome + manage posts link',
    settingsLoggedOutPass && settingsSignedInPass,
    `href=${manageHref} signedInNav=${settingsSignedInPass}`,
  );

  await authContext.close();

  // Test 7 — select-location via feed header → confirm → return to feed
  const selectPage = await browser.newPage({ viewport: { width: 375, height: 812, locale: 'en-US' } });
  await selectPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await selectPage.getByRole('link', { name: /Confirm location|location|位置|posizione/i }).click();
  await selectPage.waitForURL(/\/select-location/, { timeout: 15000 });
  const canvas = selectPage.locator('.maplibregl-canvas');
  const confirmBtn = selectPage.getByRole('button', { name: /Confirm location|确认位置|Conferma posizione/i });
  await Promise.race([
    canvas.waitFor({ state: 'visible', timeout: 15000 }),
    confirmBtn.waitFor({ state: 'visible', timeout: 15000 }),
  ]);
  await confirmBtn.click();
  await selectPage.waitForFunction(() => window.location.pathname === '/', undefined, { timeout: 30000 });
  const stored = await selectPage.evaluate((key) => {
    const raw = localStorage.getItem(key);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, 'shoumanwu_browse_center');
  const browseOk =
    stored &&
    typeof stored.lat === 'number' &&
    typeof stored.lng === 'number' &&
    Number.isFinite(stored.lat) &&
    Number.isFinite(stored.lng);
  record(7, 'Select-location flow', browseOk, browseOk ? `lat=${stored.lat.toFixed(3)}` : 'no browse center');

  await browser.close();

  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log(`${passed}/${results.length} passed`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => `[${f.id}] ${f.name}`).join(', '));
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  })
  .finally(() => cleanupAll());
