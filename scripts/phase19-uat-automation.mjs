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

const results = [];

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

async function serverReachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function runBrowserScenarios() {
  const local = loadEnv(resolve(root, '.env.local'));
  const scraper = loadEnv(resolve(root, 'scraper/.env'));
  const url = local.NEXT_PUBLIC_SUPABASE_URL || scraper.SUPABASE_URL;
  const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY ?? scraper.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || !anonKey) {
    for (const scenario of [
      [1, 'Anonymous feed loads without auth redirect'],
      [2, 'Scraped detail preview wall hides description'],
      [3, 'Preview sticky CTA visible for anonymous user'],
      [6, 'Anonymous Post nav tap opens auth modal without navigation'],
      [7, 'Anonymous direct /post hides PostForm fields'],
      [8, 'Authenticated user sees full detail content'],
      [9, 'Heart favorite gate opens auth modal on detail preview'],
      [11, 'Shared listing link shows preview when logged out'],
    ]) {
      record(scenario[0], scenario[1], false, 'Supabase env missing — skipped');
    }
    return;
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const listingId = randomUUID();
  const now = new Date();

  await admin.from('listings').insert({
    id: listingId,
    source: 'subito',
    external_id: `p19-uat-${Date.now()}`,
    title: 'P19UAT Preview wall scraped item',
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

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const onFeed = !page.url().includes('/login');
    record(1, 'Anonymous feed loads without auth redirect', onFeed, page.url());

    await page.goto(`${BASE}/listing/${listingId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    const hasPreviewCta = await page
      .getByRole('button', { name: /sign in to view full details|登录查看完整详情|accedi per i dettagli/i })
      .isVisible()
      .catch(() => false);
    record(3, 'Preview sticky CTA visible for anonymous user', hasPreviewCta);

    const descriptionHidden = !(await page
      .getByText(/description|描述|descrizione/i)
      .first()
      .isVisible()
      .catch(() => false));
    record(2, 'Scraped detail preview wall hides description', descriptionHidden);

    const stillOnListing = page.url().includes(`/listing/${listingId}`);
    record(11, 'Shared listing link shows preview when logged out', stillOnListing && hasPreviewCta);

    const heartButton = page.getByRole('button', { name: /favorites|收藏|preferiti/i }).first();
    await heartButton.click().catch(() => {});
    const heartModalVisible = await page
      .getByRole('dialog')
      .getByText(/sign in to save favorites|登录.*收藏|accedi.*preferiti/i)
      .isVisible()
      .catch(() => false);
    record(9, 'Heart favorite gate opens auth modal on detail preview', heartModalVisible);
    await page.keyboard.press('Escape').catch(() => {});

    await page.goto(`${BASE}/post`, { waitUntil: 'domcontentloaded', timeout: 45000 });

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
      gateTitleVisible
        ? titleInputHidden && submitHidden
          ? 'gate shown, form hidden'
          : 'form fields still visible'
        : 'gate empty state not found',
    );

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const feedUrlBefore = page.url();

    const postNav = page.getByRole('link', { name: /post|发布|pubblica/i });
    await postNav.click().catch(() => {});
    await page.waitForTimeout(300);

    const stayedOnFeed = page.url() === feedUrlBefore || !page.url().includes('/post');
    const postNavModalVisible = await page
      .getByRole('dialog')
      .getByText(/sign in to continue|登录以继续|accedi per continuare/i)
      .isVisible()
      .catch(() => false);
    record(
      6,
      'Anonymous Post nav tap opens auth modal without navigation',
      stayedOnFeed && postNavModalVisible,
      stayedOnFeed ? (postNavModalVisible ? 'modal opened' : 'modal not visible') : `navigated to ${page.url()}`,
    );
    await page.keyboard.press('Escape').catch(() => {});

    record(8, 'Authenticated user sees full detail content', false, 'stub — auth cookie flow deferred');
  } finally {
    await browser.close();
    await admin.from('listings').delete().eq('id', listingId);
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

  await runBrowserScenarios();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log('Stub scenarios may defer auth flows — review before ship.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
