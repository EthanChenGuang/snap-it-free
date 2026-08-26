#!/usr/bin/env node
/**
 * Phase 11 autonomous UAT — grid listing cards (FREE badge, heart, metadata, claimed, detail boundary).
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase11-uat-automation.mjs
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
const FILTER_PREFS_KEY = 'shoumanwu_filter_prefs';
const BROWSE_CENTER_KEY = 'shoumanwu_browse_center';
const FAVORITES_KEY = 'shoumanwu_favorites';

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
  const email = `p11-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P11UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function passwordAuthCookies(email, password = 'P11UatPass123!') {
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
    title: overrides.title ?? `P11UAT ${id.slice(0, 8)}`,
    photo_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    external_url: `/listing/${id}`,
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    city: 'Venice',
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
    ...overrides,
  };
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
  for (const uid of cleanup.users) {
    await admin.auth.admin.deleteUser(uid);
  }
}

async function clearClientState(page) {
  await page.evaluate(
    (keys) => {
      for (const key of keys) localStorage.removeItem(key);
    },
    [FILTER_PREFS_KEY, BROWSE_CENTER_KEY, FAVORITES_KEY],
  );
}

async function narrowToP11(page, query = 'P11UAT') {
  const search = page.getByRole('searchbox');
  await search.click();
  await search.fill(query);
  await page.waitForTimeout(600);
}

async function firstCard(page) {
  return page.locator('section.grid.grid-cols-2 > a.feed-card').first();
}

async function main() {
  console.log(`=== Phase 11 Autonomous UAT (${BASE}) ===\n`);

  await admin.from('listings').delete().ilike('title', 'P11UAT%');

  const active = veniceListing({ title: 'P11UAT Active visual card' });
  const claimed = veniceListing({ title: 'P11UAT Claimed reserved card', status: 'claimed' });
  await seedListings([active, claimed]);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await clearClientState(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('section.grid.grid-cols-2 > a.feed-card').first().waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
  await narrowToP11(page, 'P11UAT Active');

  const card = page.locator('a.feed-card').filter({ hasText: 'P11UAT Active visual card' }).first();
  await card.waitFor({ state: 'visible', timeout: 15000 });

  // Test 1 — Grid visual contract (Stitch)
  const visual = await card.evaluate((el) => {
    const freeBadge = el.querySelector('span.uppercase');
    const heartBtn = el.querySelector('button[aria-label]');
    const imageWrap = el.querySelector('.feed-card-media, .aspect-\\[4\\/5\\]');
    const title = el.querySelector('h3');
    const meta = el.querySelector('.feed-card-caption p');
    return {
      hasFreeText: /free/i.test(freeBadge?.textContent ?? ''),
      hasFreeBadge: Boolean(freeBadge),
      hasHeart: Boolean(heartBtn),
      aspect45: Boolean(imageWrap),
      rounded2xl: imageWrap?.className.includes('rounded-2xl') ?? false,
      titleClamp: title?.className.includes('line-clamp') ?? false,
      metaLabel: meta?.className.includes('text-label-sm') ?? false,
    };
  });

  record(
    1,
    'Grid visual contract (feed card)',
    visual.hasFreeText &&
      visual.hasFreeBadge &&
      visual.hasHeart &&
      visual.aspect45 &&
      visual.rounded2xl &&
      visual.titleClamp &&
      visual.metaLabel,
    JSON.stringify(visual),
  );

  // Test 2 — Favorite toggle + auth gate (logged out → modal; logged in → toggle + no nav)
  const urlBeforeHeart = page.url();
  const heart = card.locator('button[aria-label]').first();
  await heart.click();
  await page.waitForTimeout(400);
  const authDialog = page.getByRole('dialog');
  const authVisible = await authDialog.isVisible().catch(() => false);
  const authTitle = authVisible ? await authDialog.textContent() : '';
  const authGateOk = authVisible && /sign in/i.test(authTitle);
  const urlAfterLoggedOutHeart = page.url();
  const noNavOnHeart = urlAfterLoggedOutHeart === urlBeforeHeart;

  if (authVisible) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  const authedUser = await createTestUser('fav');
  const authedContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await authedContext.addCookies(await passwordAuthCookies(authedUser.email));
  const authedPage = await authedContext.newPage();
  await authedPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await clearClientState(authedPage);
  await authedPage.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await authedPage.waitForTimeout(1500);
  await narrowToP11(authedPage, 'P11UAT Active');
  const authedCard = authedPage.locator('a.feed-card').filter({ hasText: 'P11UAT Active visual card' }).first();
  await authedCard.waitFor({ state: 'visible', timeout: 15000 });
  const authedUrlBefore = authedPage.url();
  const authedHeart = authedCard.locator('button[aria-label]').first();
  await authedHeart.click();
  await authedPage.waitForTimeout(1200);
  const favoritedFill = await authedHeart.evaluate((btn) => {
    const icon = btn.querySelector('span.material-symbols-outlined');
    if (!icon) return false;
    const style = icon.getAttribute('style') ?? '';
    const cls = icon.className;
    return (
      btn.getAttribute('aria-pressed') === 'true' ||
      style.includes("'FILL' 1") ||
      cls.includes('text-accent-orange')
    );
  });
  const toastVisible = await authedPage
    .locator('[data-radix-toast-viewport] [role="status"], [data-state="open"][role="status"]')
    .first()
    .isVisible()
    .catch(() => false);
  const authedUrlAfter = authedPage.url();
  const authedNoNav = authedUrlAfter === authedUrlBefore;

  record(
    2,
    'Favorite toggle + auth gate',
    authGateOk && noNavOnHeart && favoritedFill && authedNoNav,
    `authModal=${authGateOk} noNavLoggedOut=${noNavOnHeart} orangeFill=${favoritedFill} toast=${toastVisible} noNavAuthed=${authedNoNav}`,
  );

  // Test 3 — Favorites grid parity (single heart + distance metadata)
  await authedPage.evaluate(
    ({ centerKey, favKey, listingId, prefsKey }) => {
      localStorage.setItem(
        centerKey,
        JSON.stringify({ lat: 45.434, lng: 12.338, label: 'Venice center' }),
      );
      localStorage.setItem(prefsKey, JSON.stringify({
        mode: 'map',
        city: 'all',
        categories: [],
        radiusEnabled: true,
        radiusKm: 50,
      }));
      localStorage.setItem(favKey, JSON.stringify([listingId]));
    },
    { centerKey: BROWSE_CENTER_KEY, favKey: FAVORITES_KEY, listingId: active.id, prefsKey: FILTER_PREFS_KEY },
  );
  await authedPage.goto(`${BASE}/favorites`, { waitUntil: 'domcontentloaded' });
  await authedPage.locator('section.grid.grid-cols-2 > a.feed-card').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const favCard = authedPage.locator('section.grid.grid-cols-2 > a.feed-card').first();
  const favMetrics = await favCard.evaluate((el) => {
    const hearts = el.querySelectorAll('button[aria-label]');
    const meta = el.querySelector('p.text-xs')?.textContent ?? '';
    const grid = el.closest('section.grid');
    return {
      heartCount: hearts.length,
      meta,
      gridGap: grid ? getComputedStyle(grid).gap : '',
    };
  });
  const distanceInMeta = /\d+(\.\d+)?\s*(km|m)\s*·/i.test(favMetrics.meta);
  const singleHeart = favMetrics.heartCount === 1;
  const gapOk = favMetrics.gridGap === '12px' || favMetrics.gridGap.includes('12');

  record(
    3,
    'Favorites grid parity',
    singleHeart && distanceInMeta && gapOk,
    `hearts=${favMetrics.heartCount} meta="${favMetrics.meta}" gap=${favMetrics.gridGap}`,
  );

  // Test 4 — Claimed listing treatment
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await narrowToP11(page, 'P11UAT Claimed');
  const claimedCard = page.locator('a.feed-card').filter({ hasText: 'P11UAT Claimed reserved card' }).first();
  await claimedCard.waitFor({ state: 'visible', timeout: 15000 });
  const claimedMetrics = await claimedCard.evaluate((el) => {
    const img = el.querySelector('img');
    const freeBadge = el.querySelector('span.uppercase');
    const heartBtn = el.querySelector('button[aria-label]');
    const meta = el.querySelector('p.text-xs')?.textContent ?? '';
    return {
      imgOpacity: img ? parseFloat(getComputedStyle(img).opacity) : 1,
      freeOpacity: freeBadge ? parseFloat(getComputedStyle(freeBadge).opacity) : 1,
      heartOpacity: heartBtn ? parseFloat(getComputedStyle(heartBtn).opacity) : 1,
      reservedSuffix: /reserved/i.test(meta),
      meta,
    };
  });
  record(
    4,
    'Claimed listing treatment',
    claimedMetrics.imgOpacity <= 0.65 &&
      claimedMetrics.freeOpacity >= 0.95 &&
      claimedMetrics.heartOpacity >= 0.95 &&
      claimedMetrics.reservedSuffix,
    JSON.stringify(claimedMetrics),
  );

  // Test 5 — Grid vs detail Claim boundary
  const gridClaimButtons = await page.locator('section.grid.grid-cols-2 button').filter({ hasText: /claim/i }).count();
  await page.locator('a.feed-card').filter({ hasText: 'P11UAT Active visual card' }).first().click();
  await page.waitForURL(/\/listing\//, { timeout: 15000 });
  const detailClaim = await page.getByRole('button', { name: /claim this item/i }).isVisible({ timeout: 8000 }).catch(() => false);
  const detailHtml = await page.content();
  const detailHasClaimShell = /claim this item|claimed/i.test(detailHtml);

  record(
    5,
    'Grid vs detail Claim boundary',
    gridClaimButtons === 0 && (detailClaim || detailHasClaimShell),
    `gridClaimBtns=${gridClaimButtons} detailClaimBtn=${detailClaim} detailShell=${detailHasClaimShell}`,
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
