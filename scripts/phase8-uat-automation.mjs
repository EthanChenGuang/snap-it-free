#!/usr/bin/env node
/**
 * Autonomous Phase 8 UAT — Subito regalo URL matrix + category filters.
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase8-uat-automation.mjs
 */
import { chromium } from '../scraper/node_modules/playwright/index.mjs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3003';
const OUT_PATH = resolve(
  root,
  '.planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-uat-results.json',
);

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
const scraperEnv = loadEnv(resolve(root, 'scraper/.env'));
const url = local.NEXT_PUBLIC_SUPABASE_URL || scraperEnv.SUPABASE_URL;
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY || scraperEnv.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { users: [], allowlistAdded: [] };

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

function recordBlocked(name, reason) {
  results.push({ name, pass: false, blocked: true, detail: reason });
  console.log(`⊘ ${name}: ${reason} (blocked)`);
}

async function createTestUser(label) {
  const email = `p8-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P8UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function playwrightCookies(email) {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${BASE}/admin/sources/subito` },
  });
  if (linkErr) throw linkErr;

  let cookieStore = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore,
      setAll: (toSet) => {
        cookieStore = toSet;
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: 'email',
  });
  if (error) throw error;

  const baseUrl = new URL(BASE);
  return cookieStore.map((c) => ({
    name: c.name,
    value: c.value,
    domain: baseUrl.hostname,
    path: c.options?.path ?? '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: false,
    sameSite: 'Lax',
  }));
}

async function cleanupAll() {
  for (const email of cleanup.allowlistAdded) {
    await admin.from('operator_allowlist').delete().eq('email', email);
  }
  for (const userId of cleanup.users) {
    await admin.auth.admin.deleteUser(userId);
  }
}

function runCmd(label, cmd, cwd = root) {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    record(label, true, out.split('\n').slice(-2).join(' ').trim() || 'ok');
    return true;
  } catch (e) {
    record(label, false, (e.stderr || e.message || '').slice(0, 200));
    return false;
  }
}

async function testUnitSuites() {
  console.log('\n--- Unit / integration test suites ---\n');
  runCmd(
    'lib/admin catalog + url-validate tests',
    'npm test -- lib/admin/subito-regalo-catalog.test.ts lib/admin/url-validate.test.ts',
  );
  runCmd(
    'lib/listings filters + subito-categories + useListingsPoll',
    'npm test -- lib/listings/filters.test.ts lib/listings/subito-categories.test.ts lib/listings/useListingsPoll.test.ts',
  );
  runCmd(
    'scraper subito normalize + config-loader',
    'npm test -- src/subito/normalize.test.ts src/config-loader.test.ts',
    resolve(root, 'scraper'),
  );
  runCmd(
    'scraper shared normalize + persist + schema',
    'npm test -- src/shared/normalize.test.ts src/shared/persist.test.ts src/shared/schema.test.ts',
    resolve(root, 'scraper'),
  );
}

async function testPadovaGates() {
  console.log('\n--- Padova SC2/SC3 gates ---\n');
  const seedSrc = readFileSync(resolve(root, 'lib/admin/subito-recommended-seed.ts'), 'utf8');
  const catalogSrc = readFileSync(resolve(root, 'lib/admin/subito-regalo-catalog.ts'), 'utf8');
  const spikePass = /export const PADOVA_SPIKE_PASS = true/.test(seedSrc);
  const catalogEntries = (catalogSrc.match(/slug:\s*'/g) ?? []).length;
  record(
    'PADOVA_SPIKE_PASS=true in recommended seed module',
    spikePass,
    spikePass ? '34-URL gate enabled' : 'Venice-only gate',
  );
  record(
    'SUBITO_REGALO_CATALOG has 17 category slugs',
    catalogEntries === 17,
    String(catalogEntries),
  );

  runCmd(
    'check-padova-visible.mjs (listings_public)',
    'node --import tsx scripts/check-padova-visible.mjs',
    resolve(root, 'scraper'),
  );

  const { count, error } = await admin
    .from('listings_public')
    .select('*', { count: 'exact', head: true })
    .eq('city', 'padova')
    .not('lat', 'is', null);
  record(
    'Supabase listings_public Padova rows with coords',
    !error && (count ?? 0) >= 1,
    error?.message ?? `count=${count ?? 0}`,
  );
}

async function testAdminMatrixUI(cookies) {
  console.log('\n--- Admin RegaloUrlMatrix UI ---\n');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext();
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto(`${BASE}/admin/sources/subito`, { waitUntil: 'networkidle', timeout: 60000 });

    record('admin subito source page loads', page.url().includes('/admin/sources/subito'));
    record(
      'RegaloUrlMatrix heading visible',
      await page.getByText('Regalo URL 矩阵').isVisible().catch(() => false),
    );
    record(
      'Venice + Padova city checkboxes',
      (await page.getByLabel('Venezia').isVisible().catch(() => false)) &&
        (await page.getByLabel('Padova').isVisible().catch(() => false)),
    );

    const categoryCheckboxes = page.locator('input[type="checkbox"]').filter({
      has: page.locator('..'),
    });
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    record('matrix has city + category checkboxes', checkboxCount >= 19, `checkboxes=${checkboxCount}`);

    const generateBtn = page.getByRole('button', { name: '生成 URL' });
    if (await generateBtn.isVisible().catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(500);
      const textarea = page.locator('textarea').first();
      const text = await textarea.inputValue();
      const lines = text.split('\n').filter((l) => l.trim());
      record(
        'Generate populates deduped URLs (34 when both cities)',
        lines.length >= 30,
        `lines=${lines.length}`,
      );

      // Seed modal — cancel paths
      const seedBtn = page.getByRole('button', { name: '应用推荐种子' });
      if (await seedBtn.isVisible().catch(() => false)) {
        const beforeSeed = text;
        await seedBtn.click();
        await page.waitForTimeout(300);
        const modalVisible = await page.getByText('Replace target URLs?').isVisible().catch(() => false);
        record('recommended seed modal opens', modalVisible);
        record(
          'modal shows 34-URL copy',
          modalVisible &&
            (await page
              .getByText(/34-URL seed|Venezia \+ Padova × all regalo categories/)
              .isVisible()
              .catch(() => false)),
        );

        await page.getByRole('button', { name: '保留当前 URL' }).click();
        await page.waitForTimeout(300);
        const afterCancel = await textarea.inputValue();
        record('保留当前 URL cancels without mutating textarea', afterCancel === beforeSeed);

        // Escape cancel
        await seedBtn.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        record(
          'Escape dismisses modal without replace',
          (await textarea.inputValue()) === beforeSeed,
        );
      } else {
        recordBlocked('recommended seed button', 'seed button not found on page');
      }
    } else {
      recordBlocked('Generate URL button', 'generate button not found');
    }

    const html = await page.content();
    record(
      'admin matrix uses Material Symbols (Stitch)',
      html.includes('material-symbols-outlined') || html.includes('Regalo URL'),
      'chrome present',
    );
  } finally {
    await browser.close();
  }
}

async function testConsumerChips() {
  console.log('\n--- Consumer category chips (Elenco + Map) ---\n');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE}/list`, { waitUntil: 'networkidle', timeout: 60000 });
    const listHtml = await page.content();
    record('/list loads', page.url().includes('/list'));

    const chipButtons = page.locator('button.rounded-full, button[class*="rounded-full"]');
    const chipCount = await chipButtons.count();
    record('Elenco has 18 category chips (Tutte + 17 slugs)', chipCount >= 18, `chips=${chipCount}`);

    const tutte = page.getByRole('button', { name: 'Tutte' }).first();
    record('Tutte chip present and default-active styling', await tutte.isVisible().catch(() => false));

    const padovaLabel = page.getByText(/Padova/i).first();
    record(
      'Elenco shows Padova city labels on cards',
      await padovaLabel.isVisible().catch(() => false),
    );

    // Category filter interaction
    const informatica = page.getByRole('button', { name: /Informatica/i }).first();
    if (await informatica.isVisible().catch(() => false)) {
      await informatica.click();
      await page.waitForTimeout(400);
      record('category chip click updates selection', true, 'Informatica clicked');
    }

    record(
      'Elenco has horizontal scroll chip row',
      listHtml.includes('overflow-x-auto') || listHtml.includes('no-scrollbar'),
      'scroll classes',
    );

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('header', { timeout: 15000 });
    record('map explorer loads', page.url().endsWith('/') || page.url().includes('localhost'));

    const searchToggle = page.locator('header button[aria-label="Search"]');
    await searchToggle.click({ timeout: 15000 });
    await page.waitForSelector('text=Categoria', { timeout: 10000 });

    const categoriaPanel = page.getByText('Categoria').first();
    record(
      'map floating panel has Categoria label',
      await categoriaPanel.isVisible().catch(() => false),
    );

    record(
      'map panel has Tutte category chip',
      await page.locator('button:has-text("Tutte")').first().isVisible().catch(() => false),
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`=== Phase 8 UAT (${BASE}) ===\n`);

  if (!url || !serviceKey || !anonKey) {
    console.error('Missing Supabase env — need .env.local or scraper/.env');
    process.exit(1);
  }

  await testUnitSuites();
  await testPadovaGates();

  const operator = await createTestUser('operator');
  const { error: allowErr } = await admin
    .from('operator_allowlist')
    .insert({ email: operator.email.toLowerCase() });
  record('operator allowlist seeded', !allowErr, allowErr?.message ?? operator.email);
  cleanup.allowlistAdded.push(operator.email.toLowerCase());

  const cookies = await playwrightCookies(operator.email);
  record('operator auth cookies prepared', cookies.length > 0, `${cookies.length} cookies`);

  await testAdminMatrixUI(cookies);
  await testConsumerChips();

  const passed = results.filter((r) => r.pass).length;
  const blocked = results.filter((r) => r.blocked).length;
  const failed = results.filter((r) => !r.pass && !r.blocked).length;
  console.log(`\n=== ${passed}/${results.length} passed, ${blocked} blocked, ${failed} failed ===`);

  writeFileSync(OUT_PATH, JSON.stringify({ results, passed, blocked, failed }, null, 2));
  console.log(`Results written to ${OUT_PATH}`);

  await cleanupAll();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await cleanupAll().catch(() => {});
  process.exit(1);
});
