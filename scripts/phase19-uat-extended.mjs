#!/usr/bin/env node
/**
 * Phase 19 extended UAT — manual checklist items automated where possible.
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
const APP_PREFERENCES_KEY = 'shoumanwu_app_preferences';
const FAVORITES_KEY = 'shoumanwu_favorites';

const results = [];
const cleanup = { users: [], listings: [] };

function record(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} [${id}] ${name}${detail ? `: ${detail}` : ''}`);
}

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

async function createTestUser(admin, label) {
  const email = `p19-ext-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P19UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function passwordAuthCookies(supabaseUrl, anonKey, email) {
  const anon = createClient(supabaseUrl, anonKey);
  const { data, error } = await anon.auth.signInWithPassword({ email, password: 'P19UatPass123!' });
  if (error) throw error;
  const sessionPayload = JSON.stringify({
    access_token: data.session.access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: data.session.refresh_token,
    user: data.session.user,
  });
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
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

function navLink(page, href) {
  return page.locator(`.feed-glass-bottom-nav a[href="${href}"]`);
}

async function waitForAuthSettled(page) {
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function cleanupAll(admin) {
  for (const listingId of cleanup.listings) {
    await admin.from('listings').delete().eq('id', listingId);
  }
  for (const userId of cleanup.users) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  console.log('=== Phase 19 Extended UAT ===\n');
  const local = loadEnv(resolve(root, '.env.local'));
  const scraper = loadEnv(resolve(root, 'scraper/.env'));
  const url = local.NEXT_PUBLIC_SUPABASE_URL || scraper.SUPABASE_URL;
  const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY ?? scraper.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.log('Supabase env missing — abort');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const scrapedId = randomUUID();
  const now = new Date();
  await admin.from('listings').insert({
    id: scrapedId,
    source: 'subito',
    external_id: `p19-ext-${Date.now()}`,
    title: 'P19EXT scraped listing',
    description: 'SECRET full body must stay hidden until sign-in',
    photo_url:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    external_url: 'https://www.subito.it/annunci-veneto/vendita/usato/',
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    city: 'venezia',
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
  });
  cleanup.listings.push(scrapedId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  try {
    // 13 — AUTH-07 OAuth parity on the guest auth gate card
    // (D-260826: the gate card is open by default on the preview wall — no CTA
    // click needed — so this just inspects the card that's already showing.)
    await page.goto(`${BASE}/listing/${scrapedId}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(800);
    const googleVisible = await page.getByRole('button', { name: /google/i }).isVisible().catch(() => false);
    const facebookVisible = await page.getByRole('button', { name: /facebook/i }).isVisible().catch(() => false);
    const emailVisible = await page.locator('#guest-gate-email').isVisible().catch(() => false);
    record(
      13,
      'AUTH-07 guest gate card shows Google + email OTP (Facebook visible or hidden per env)',
      googleVisible && emailVisible,
      `google=${googleVisible} email=${emailVisible} facebook=${facebookVisible}`,
    );

    // 14 — Filter sheet + search without auth modal (AUTH-08)
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthSettled(page);
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="搜索"], input[placeholder*="Cerca"]').first();
    const searchVisible = await searchInput.isVisible().catch(() => false);
    if (searchVisible) {
      await searchInput.fill('chair');
      await page.waitForTimeout(300);
    }
    const filterBtn = page.getByRole('button', { name: /filter|筛选|filtri/i }).first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(400);
    }
    const filterSheetOpen = await page.locator('[role="dialog"], .filter-sheet-scroll').first().isVisible().catch(() => false);
    const authModalDuringFilter = await page
      .getByRole('dialog')
      .getByText(/sign in|登录|accedi/i)
      .isVisible()
      .catch(() => false);
    record(
      14,
      'Filter sheet and search usable without auth modal',
      searchVisible && filterSheetOpen && !authModalDuringFilter,
      `search=${searchVisible} filter=${filterSheetOpen} authModal=${authModalDuringFilter}`,
    );
    await page.keyboard.press('Escape').catch(() => {});

    // 15 — Hard refresh: no full description flash during load
    await page.goto(`${BASE}/listing/${scrapedId}`, { waitUntil: 'commit', timeout: 45000 });
    const descEarly = await page
      .getByText('SECRET full body must stay hidden')
      .isVisible()
      .catch(() => false);
    await page.waitForSelector('h1', { timeout: 15000 });
    const descAfterLoad = await page
      .getByText('SECRET full body must stay hidden')
      .isVisible()
      .catch(() => false);
    record(
      15,
      'Hard refresh preview — description never leaks to anonymous',
      !descEarly && !descAfterLoad,
      `early=${descEarly} afterLoad=${descAfterLoad}`,
    );

    // 16 — Post-login same URL unlock (AUTH-02) via cookie injection
    const authedUser = await createTestUser(admin, 'redirect');
    const authedContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await authedContext.addCookies(await passwordAuthCookies(url, anonKey, authedUser.email));
    const authedPage = await authedContext.newPage();
    const listingUrl = `${BASE}/listing/${scrapedId}`;
    await authedPage.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await authedPage.waitForTimeout(1500);
    const sameUrl = authedPage.url().includes(`/listing/${scrapedId}`);
    const fullDesc = await authedPage.getByText('SECRET full body must stay hidden').isVisible().catch(() => false);
    const noPreviewCta = !(await authedPage
      .locator('#guest-gate-email')
      .isVisible()
      .catch(() => false));
    record(
      16,
      'Authenticated user unlocks full detail on same URL',
      sameUrl && fullDesc && noPreviewCta,
      sameUrl ? (fullDesc ? 'full content on same URL' : 'no full desc') : authedPage.url(),
    );

    // 17 — Favorites nav redirectTo wiring (modal opens with favorites title)
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthSettled(page);
    await navLink(page, '/favorites').click();
    await page.waitForTimeout(400);
    const favModalTitle = await page
      .getByRole('dialog')
      .getByText(/sign in to view and manage favorites|登录查看和管理收藏|accedi per vedere e gestire/i)
      .isVisible()
      .catch(() => false);
    record(17, 'Favorites nav modal uses favoritesNavTitle copy', favModalTitle);
    await page.keyboard.press('Escape').catch(() => {});

    // 18 — Post nav modal uses modalTitle copy
    await navLink(page, '/post').click();
    await page.waitForTimeout(400);
    const postModalTitle = await page
      .getByRole('dialog')
      .getByText(/sign in to continue|登录以继续|accedi per continuare/i)
      .isVisible()
      .catch(() => false);
    record(18, 'Post nav modal uses modalTitle copy', postModalTitle);
    await page.keyboard.press('Escape').catch(() => {});

    // 19 — Locale post gate copy (en)
    const enContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const enPage = await enContext.newPage();
    await enPage.addInitScript(
      ({ key }) => {
        localStorage.setItem(key, JSON.stringify({ language: 'en', appearance: 'light', soundAlerts: false }));
      },
      { key: APP_PREFERENCES_KEY },
    );
    await enPage.goto(`${BASE}/post`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthSettled(enPage);
    const enGate = await enPage
      .getByRole('heading', { name: /sign in to post a free item/i })
      .isVisible()
      .catch(() => false);
    record(19, 'English post gateTitle renders correctly', enGate);
    await enContext.close();

    // 20 — Favorites merge: localStorage seed visible after auth (smoke)
    const mergeContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await mergeContext.addInitScript(
      ({ favKey, listingId }) => {
        localStorage.setItem(favKey, JSON.stringify([listingId]));
      },
      { favKey: FAVORITES_KEY, listingId: scrapedId },
    );
    const mergeUser = await createTestUser(admin, 'merge');
    await mergeContext.addCookies(await passwordAuthCookies(url, anonKey, mergeUser.email));
    const mergePage = await mergeContext.newPage();
    await mergePage.goto(`${BASE}/favorites`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await mergePage.waitForTimeout(2500);
    const mergedCard = await mergePage.getByText('P19EXT scraped listing').isVisible().catch(() => false);
    record(
      20,
      'Favorites merge — local favorite appears after sign-in',
      mergedCard,
      mergedCard ? 'listing visible on /favorites' : 'not visible yet (may need merge API)',
    );
    await mergeContext.close();
    await authedContext.close();
  } finally {
    await browser.close();
    await cleanupAll(admin);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} extended passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
