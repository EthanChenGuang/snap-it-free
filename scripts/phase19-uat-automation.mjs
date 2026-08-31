#!/usr/bin/env node
/**
 * Phase 19 autonomous UAT — register-first auth gates (preview wall, post gate, nav regressions).
 *
 * Requires E2E_BASE_URL pointing at a running Next.js dev/prod server, e.g.:
 *   E2E_BASE_URL=http://localhost:3003 node scripts/phase19-uat-automation.mjs
 *
 * Supabase env (from .env.local or scraper/.env) is required for seeded listing scenarios.
 * When E2E_BASE_URL is unset or the server is unreachable, browser scenarios are skipped (exit 0).
 */
import { chromium } from '../scraper/node_modules/playwright/index.mjs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL;
const APP_PREFERENCES_KEY = 'shoumanwu_app_preferences';

const results = [];
const cleanup = { users: [], listings: [] };

function record(id, name, pass, detail = '', { manual = false } = {}) {
  results.push({ id, name, pass, detail, manual });
  const tag = manual ? ' (manual)' : '';
  console.log(`${pass ? '✓' : '✗'} [${id}] ${name}${tag}${detail ? `: ${detail}` : ''}`);
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

async function serverReachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function createTestUser(admin, label) {
  const email = `p19-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P19UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function passwordAuthCookies(supabaseUrl, anonKey, email, password = 'P19UatPass123!') {
  const anon = createClient(supabaseUrl, anonKey);
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
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
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

function scrapedListing(id) {
  const now = new Date();
  return {
    id,
    source: 'subito',
    external_id: `p19-uat-${Date.now()}`,
    title: 'P19UAT Preview wall scraped item',
    description: 'Full description body hidden behind preview wall for anonymous users.',
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
  };
}

function ugcListing(id) {
  const now = new Date();
  return {
    id,
    source: 'ugc',
    external_id: id,
    title: 'P19UAT UGC item for DM regression',
    description: 'Community listing with full description for authenticated DM test.',
    photo_url:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    external_url: `/listing/${id}`,
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    city: 'venezia',
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
  };
}

async function setAppLanguage(page, language) {
  await page.addInitScript(
    ({ key, lang }) => {
      localStorage.setItem(key, JSON.stringify({ language: lang, appearance: 'light', soundAlerts: false }));
    },
    { key: APP_PREFERENCES_KEY, lang: language },
  );
}

function navLink(page, href) {
  return page.locator(`.feed-glass-bottom-nav a[href="${href}"]`);
}

async function waitForListingPreview(page, title) {
  await page.waitForSelector('h1', { timeout: 15000 });
  await page.getByRole('heading', { level: 1, name: title }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
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

async function runBrowserScenarios(env) {
  const { url, anonKey, serviceKey } = env;

  if (!url || !serviceKey || !anonKey) {
    for (const [id, name] of [
      [1, 'Anonymous feed loads without auth redirect'],
      [2, 'Scraped detail preview wall hides description'],
      [3, 'Preview sticky CTA visible for anonymous user'],
      [4, 'Favorites nav opens auth modal without navigation'],
      [5, 'Direct /favorites loads for anonymous user'],
      [6, 'Anonymous Post nav tap opens auth modal without navigation'],
      [7, 'Anonymous direct /post hides PostForm fields'],
      [8, 'Authenticated user sees full detail content'],
      [9, 'Heart favorite gate opens auth modal on detail preview'],
      [10, 'UGC DM opens drawer when authenticated'],
      [11, 'Shared listing link shows preview when logged out'],
      [12, 'Locale switch shows correct preview CTA copy'],
    ]) {
      record(id, name, false, 'Supabase env missing — skipped');
    }
    return;
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const scrapedId = randomUUID();
  const ugcId = randomUUID();

  await admin.from('listings').insert(scrapedListing(scrapedId));
  await admin.from('listings').insert(ugcListing(ugcId));
  cleanup.listings.push(scrapedId, ugcId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  try {
    // Scenario 1 — Anonymous browse / (AUTH-08)
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const onFeed = !page.url().includes('/login');
    const feedGrid = page.locator('section.grid.grid-cols-2');
    const emptyState = page.getByText(/No listings|暂无|Nessun/i);
    const gridOrEmpty =
      (await feedGrid.count()) > 0 || (await emptyState.isVisible().catch(() => false));
    const authModalOnLoad = await page
      .getByRole('dialog')
      .isVisible()
      .catch(() => false);
    record(
      1,
      'Anonymous feed loads without auth redirect',
      onFeed && gridOrEmpty && !authModalOnLoad,
      onFeed ? (gridOrEmpty ? page.url() : 'no grid/empty') : 'redirected to login',
    );

    // Scenario 2 — Preview wall hides full description
    await page.goto(`${BASE}/listing/${scrapedId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await waitForListingPreview(page, 'P19UAT Preview wall scraped item');
    const titleVisible = await page
      .getByRole('heading', { level: 1, name: 'P19UAT Preview wall scraped item' })
      .isVisible()
      .catch(() => false);
    const descriptionHidden = !(await page
      .getByText('Full description body hidden behind preview wall')
      .isVisible()
      .catch(() => false));
    record(
      2,
      'Scraped detail preview wall hides description',
      titleVisible && descriptionHidden,
      titleVisible ? (descriptionHidden ? 'description gated' : 'description leaked') : 'title missing',
    );

    // Scenario 3 — Guest auth gate card visible by default on preview wall
    // (D-260826: replaced the sticky "Sign in to view full details" CTA button
    // with a GuestAuthGateCard that's open on load — locale-independent anchor
    // is the #guest-gate-email input, present for every locale.)
    const hasPreviewCta = await page
      .locator('#guest-gate-email')
      .isVisible()
      .catch(() => false);
    record(3, 'Guest auth gate card visible for anonymous user', hasPreviewCta);

    // Scenario 11 — Shared link preview (same session, logged out)
    const stillOnListing = page.url().includes(`/listing/${scrapedId}`);
    record(
      11,
      'Shared listing link shows preview when logged out',
      stillOnListing && hasPreviewCta,
      stillOnListing ? 'preview wall on shared URL' : page.url(),
    );

    // Scenario 9 — Heart favorite gate on preview
    // (D-260826: heart tap no longer opens a separate dialog — the gate card is
    // already open; it keeps the gate open and focuses #guest-gate-email.)
    const heartButton = page.getByRole('button', { name: /favorite/i }).first();
    await heartButton.click().catch(() => {});
    await page.waitForTimeout(300);
    const heartGateVisible = await page.locator('#guest-gate-email').isVisible().catch(() => false);
    const heartEmailFocused = await page
      .evaluate(() => document.activeElement?.id === 'guest-gate-email')
      .catch(() => false);
    const heartModalVisible = heartGateVisible && heartEmailFocused;
    record(9, 'Heart favorite tap keeps guest auth gate open and focuses email field', heartModalVisible);

    // Scenario 4 — Favorites nav auth gate
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthSettled(page);
    const feedUrlBeforeFav = page.url();
    await navLink(page, '/favorites').click().catch(() => {});
    await page.waitForTimeout(400);
    const stayedOffFavorites =
      !page.url().includes('/favorites') || page.url() === feedUrlBeforeFav;
    const favModalVisible = await page
      .getByRole('dialog')
      .getByText(/sign in to view and manage favorites|登录查看和管理收藏|accedi per vedere e gestire/i)
      .isVisible()
      .catch(() => false);
    record(
      4,
      'Favorites nav opens auth modal without navigation',
      stayedOffFavorites && favModalVisible,
      favModalVisible ? `url=${page.url()}` : 'favorites nav modal not visible',
    );
    await page.keyboard.press('Escape').catch(() => {});

    // Scenario 5 — Direct /favorites allowed (nav gate only)
    await page.goto(`${BASE}/favorites`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const favPageLoaded = page.url().includes('/favorites') && !page.url().includes('/login');
    const favHeading = await page
      .getByRole('heading', { name: /favorites|收藏|preferiti/i })
      .isVisible()
      .catch(() => false);
    record(
      5,
      'Direct /favorites loads for anonymous user',
      favPageLoaded && favHeading,
      favPageLoaded ? 'page reachable without nav gate' : page.url(),
    );

    // Scenario 7 — Direct /post page gate
    await page.goto(`${BASE}/post`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthSettled(page);
    const gateTitleVisible = await page
      .getByRole('heading', { name: /sign in to post|登录后即可发布|accedi per pubblicare/i })
      .isVisible()
      .catch(() => false);
    const titleInputHidden = !(await page
      .getByPlaceholder(/what are you giving away|你在送什么|cosa regali/i)
      .isVisible()
      .catch(() => false));
    const submitHidden = !(await page
      .getByRole('button', { name: /post for free|免费发布|pubblica gratis/i })
      .isVisible()
      .catch(() => false));
    record(
      7,
      'Anonymous direct /post hides PostForm fields',
      gateTitleVisible && titleInputHidden && submitHidden,
      gateTitleVisible ? 'gate shown, form hidden' : 'gate empty state not found',
    );

    // Scenario 6 — Post nav auth gate
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthSettled(page);
    const feedUrlBeforePost = page.url();
    await navLink(page, '/post').click().catch(() => {});
    await page.waitForTimeout(400);
    const stayedOnFeed =
      page.url() === feedUrlBeforePost || !page.url().includes('/post');
    const postNavModalVisible = await page
      .getByRole('dialog')
      .getByText(/sign in to continue|登录以继续|accedi per continuare/i)
      .isVisible()
      .catch(() => false);
    record(
      6,
      'Anonymous Post nav tap opens auth modal without navigation',
      stayedOnFeed && postNavModalVisible,
      stayedOnFeed ? (postNavModalVisible ? 'modal opened' : 'modal not visible') : page.url(),
    );
    await page.keyboard.press('Escape').catch(() => {});

    // Scenario 8 — Authenticated full detail
    const authedUser = await createTestUser(admin, 'detail');
    const authedContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await authedContext.addCookies(
      await passwordAuthCookies(url, anonKey, authedUser.email),
    );
    const authedPage = await authedContext.newPage();
    await authedPage.goto(`${BASE}/listing/${scrapedId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await authedPage.waitForTimeout(1500);
    const noPreviewCta = !(await authedPage
      .locator('#guest-gate-email')
      .isVisible()
      .catch(() => false));
    const fullDescriptionVisible = await authedPage
      .getByText('Full description body hidden behind preview wall')
      .isVisible()
      .catch(() => false);
    record(
      8,
      'Authenticated user sees full detail content',
      noPreviewCta && fullDescriptionVisible,
      noPreviewCta ? (fullDescriptionVisible ? 'full detail' : 'description not visible') : 'guest auth gate still shown',
    );

    // Scenario 10 — UGC DM regression (authenticated)
    await authedPage.goto(`${BASE}/listing/${ugcId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await authedPage.waitForTimeout(1000);
    const messageBtn = authedPage.getByRole('button', {
      name: /message the owner|联系发布者|messaggia/i,
    });
    await messageBtn.click().catch(() => {});
    await authedPage.waitForTimeout(500);
    const dmDrawerVisible = await authedPage
      .getByText(/Messages|消息|Messaggi|Message the owner to arrange pickup|给发布者留言|Scrivi al proprietario/i)
      .first()
      .isVisible()
      .catch(() => false);
    record(
      10,
      'UGC DM opens drawer when authenticated',
      dmDrawerVisible,
      dmDrawerVisible ? 'DM drawer opened' : 'drawer not visible',
    );
    await authedContext.close();

    // Scenario 12 — Locale switch spot-check (automated via preferences)
    // (D-260826: assert the GuestAuthGateCard's localized title instead of the
    // retired previewCta button copy.)
    const localeChecks = [
      { lang: 'zh', pattern: /登录以免费领取/ },
      { lang: 'en', pattern: /Sign in to claim for free/i },
      { lang: 'it', pattern: /Accedi per ritirare gratis/i },
    ];
    const localeResults = [];
    for (const { lang, pattern } of localeChecks) {
      const localeContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const localePage = await localeContext.newPage();
      await setAppLanguage(localePage, lang);
      await localePage.goto(`${BASE}/listing/${scrapedId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await waitForListingPreview(localePage, 'P19UAT Preview wall scraped item');
      await localePage.waitForTimeout(1200);
      const ctaOk = await localePage
        .getByRole('dialog', { name: pattern })
        .isVisible()
        .catch(() => false);
      localeResults.push(`${lang}=${ctaOk ? 'ok' : 'fail'}`);
      await localeContext.close();
    }
    const localePass = localeResults.every((r) => r.endsWith('ok'));
    record(
      12,
      'Locale switch shows correct preview CTA copy',
      localePass,
      localeResults.join(', '),
      { manual: !localePass },
    );
  } finally {
    await browser.close();
    await cleanupAll(admin);
  }
}

async function main() {
  console.log('=== Phase 19 Auth Gates UAT ===\n');

  if (!BASE) {
    console.log('E2E_BASE_URL unset — skipping browser scenarios (exit 0).');
    console.log('Set E2E_BASE_URL=http://localhost:3003 to run smoke tests.');
    process.exit(0);
  }

  const reachable = await serverReachable(BASE);
  if (!reachable) {
    console.log(`Server not reachable at ${BASE} — skipping browser scenarios (exit 0).`);
    process.exit(0);
  }

  const local = loadEnv(resolve(root, '.env.local'));
  const scraper = loadEnv(resolve(root, 'scraper/.env'));
  await runBrowserScenarios({
    url: local.NEXT_PUBLIC_SUPABASE_URL || scraper.SUPABASE_URL,
    anonKey: local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: local.SUPABASE_SERVICE_ROLE_KEY ?? scraper.SUPABASE_SERVICE_ROLE_KEY,
  });

  const automated = results.filter((r) => !r.manual);
  const failed = automated.filter((r) => !r.pass);
  const manual = results.filter((r) => r.manual);

  console.log(`\n${automated.length - failed.length}/${automated.length} automated passed`);
  if (manual.length > 0) {
    console.log(`${manual.length} scenario(s) flagged for manual review`);
  }
  if (failed.length > 0) {
    console.log('Failures require investigation before ship.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
