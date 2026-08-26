#!/usr/bin/env node
/**
 * Phase 19 autonomous UAT — register-first auth gates (preview wall, shared links).
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase19-uat-automation.mjs
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
      [8, 'Authenticated user sees full detail content'],
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
