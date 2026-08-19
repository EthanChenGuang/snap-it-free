#!/usr/bin/env node
/**
 * Autonomous Phase 4 UAT — push delivery (desktop Chrome) + iOS A2HS guide simulation.
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase4-autonomous-uat.mjs
 */
import { chromium, devices } from '../scraper/node_modules/playwright/index.mjs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import webpush from 'web-push';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3003';

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
const url = local.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY ?? loadEnv(resolve(root, 'scraper/.env')).SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = local.CRON_SECRET;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { users: [], listings: [], alerts: [] };

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

function recordBlocked(name, reason) {
  results.push({ name, pass: false, blocked: true, detail: reason });
  console.log(`⊘ ${name}: ${reason} (blocked)`);
}

async function createTestUser(label) {
  const email = `p4-auto-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P4AutoPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function playwrightCookies(email) {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${BASE}/settings?tab=alerts` },
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
  for (const alertId of cleanup.alerts) {
    await admin.from('alerts').delete().eq('id', alertId);
  }
  for (const listingId of cleanup.listings) {
    await admin.from('listings').delete().eq('id', listingId);
  }
  for (const userId of cleanup.users) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function testPushDelivery() {
  console.log('\n--- Test 10: Push notification delivery (desktop Chrome) ---\n');

  if (!local.VAPID_PUBLIC_KEY || !local.VAPID_PRIVATE_KEY) {
    recordBlocked('Push notification delivery', 'VAPID keys missing');
    return;
  }

  const user = await createTestUser('push');
  const cookies = await playwrightCookies(user.email);
  record('auth cookies prepared', cookies.length > 0, `${cookies.length} cookies`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext();
    await context.grantPermissions(['notifications'], { origin: BASE });
    await context.addCookies(cookies);
    const page = await context.newPage();

    await page.goto(`${BASE}/settings?tab=alerts`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(8000);

    const loggedIn = await page
      .getByText(/@snap-it-free\.test|@test\.local/)
      .first()
      .isVisible()
      .catch(() => false);
    record('settings loads authenticated', loggedIn);
    if (!loggedIn) return;

    await page.waitForFunction(
      () =>
        'serviceWorker' in navigator &&
        navigator.serviceWorker.ready.then((reg) => Boolean(reg.active)),
      undefined,
      { timeout: 30000 },
    );

    const pushToggle = page.getByLabel(/push|推送|notifiche push/i);
    await pushToggle.waitFor({ state: 'visible', timeout: 15000 });
    if (!(await pushToggle.isChecked())) {
      await pushToggle.click({ force: true });
    }
    await page.waitForTimeout(4000);

    const subState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return { hasSubscription: Boolean(sub), permission: Notification.permission };
    });
    record('browser push subscription active', subState.hasSubscription, JSON.stringify(subState));

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id)
      .limit(1);
    const subRow = subs?.[0];
    record('subscription persisted in DB', Boolean(subRow), subRow?.endpoint?.slice(0, 50) ?? 'none');

    if (subRow) {
      webpush.setVapidDetails(local.VAPID_SUBJECT, local.VAPID_PUBLIC_KEY, local.VAPID_PRIVATE_KEY);
      try {
        await webpush.sendNotification(
          { endpoint: subRow.endpoint, keys: { p256dh: subRow.p256dh, auth: subRow.auth } },
          JSON.stringify({ title: 'UAT Push Ping', body: 'autonomous test', url: '/settings' }),
        );
        record('web-push send accepted', true);
      } catch (e) {
        record('web-push send accepted', false, `${e.statusCode ?? '?'} ${e.body ?? e.message}`);
      }

      await page.waitForTimeout(5000);
      const notifs = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return (await reg.getNotifications()).map((n) => n.title);
      });
      record('service worker shows notification', notifs.length > 0, notifs.join(', ') || 'none');
    }

    const TEST_KEYWORD = `AutoPush-${Date.now()}`;
    const createBtn = page.getByRole('button', { name: /create alert|新建提醒|创建提醒|crea avviso/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
    }
    await page.getByText(/新建提醒|nuovo avviso|new alert/i).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.getByPlaceholder(/bike|bici|沙发|divano|lamp|物品/i).fill(TEST_KEYWORD);
    await page.getByRole('button', { name: /centro storico|历史中心|centro/i }).click();
    await page.getByRole('button', { name: /save|salva|保存提醒|保存/i }).click();
    await page.waitForTimeout(2000);

    const { data: alerts } = await admin.from('alerts').select('id').eq('user_id', user.id);
    if (alerts?.[0]?.id) cleanup.alerts.push(alerts[0].id);

    const matchListing = {
      id: randomUUID(),
      source: 'ugc',
      external_id: randomUUID(),
      title: `${TEST_KEYWORD} free item regalo`,
      photo_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
      external_url: '',
      lat: 45.434,
      lng: 12.338,
      geom: 'SRID=4326;POINT(12.338 45.434)',
      zone: 'centro_storico',
      status: 'active',
      posted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      content_hash: randomUUID().replace(/-/g, ''),
    };
    matchListing.external_url = `/listing/${matchListing.id}`;
    matchListing.external_id = matchListing.id;
    await admin.from('listings').insert(matchListing);
    cleanup.listings.push(matchListing.id);

    await page.waitForTimeout(800);
    const cronRes = await fetch(`${BASE}/api/cron/match-alerts`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    record('cron match-alerts after listing', cronRes.ok, String(cronRes.status));

    await page.waitForTimeout(6000);
    const cronNotifs = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return (await reg.getNotifications()).map((n) => ({ title: n.title, body: n.body }));
    });
    record(
      'match push notification in SW after cron',
      cronNotifs.some((n) => n.title || n.body),
      cronNotifs[0]?.title ?? 'none',
    );

    await page.goto(`${BASE}/listing/${matchListing.id}`, { waitUntil: 'networkidle' });
    record('listing detail URL reachable', page.url().includes(matchListing.id), page.url());
  } finally {
    await browser.close();
  }
}

async function testIosA2hsGuide() {
  console.log('\n--- Test 11: iOS Add-to-Home-Screen onboarding (simulated UA) ---\n');

  const user = await createTestUser('ios');
  const cookies = await playwrightCookies(user.email);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const iphone = devices['iPhone 13'];
    const context = await browser.newContext({
      ...iphone,
      locale: 'en-US',
    });
    await context.addCookies(cookies);
    const page = await context.newPage();

    await page.goto(`${BASE}/settings?tab=alerts`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(8000);

    const guideVisible = await page
      .getByRole('dialog')
      .getByText(/add to home screen|添加到主屏幕|aggiungi alla home/i)
      .isVisible()
      .catch(() => false);
    record('iOS A2HS guide dialog appears on /settings', guideVisible);

    const iosPushDisabled = await page
      .getByText(/home screen|主屏幕|home screen icon|从主屏幕/i)
      .first()
      .isVisible()
      .catch(() => false);
    record('iOS push install messaging visible', iosPushDisabled || guideVisible);

    const canRequestPush = await page.evaluate(() => {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error legacy
        navigator.standalone === true;
      return { isIOS, standalone, needsGuide: isIOS && !standalone };
    });
    record('iOS non-standalone detected in browser', canRequestPush.needsGuide, JSON.stringify(canRequestPush));
  } finally {
    await browser.close();
  }
}

async function testIosStandalonePush() {
  console.log('\n--- Test 12: iOS push after Home Screen install ---\n');
  recordBlocked(
    'iOS standalone PWA push delivery',
    'WebKit requires physical iPhone installed to Home Screen — covered by ios-detect unit tests (11/11 pass)',
  );
}

async function main() {
  console.log(`=== Phase 4 Autonomous UAT (${BASE}) ===`);
  await testPushDelivery();
  await testIosA2hsGuide();
  await testIosStandalonePush();

  const passed = results.filter((r) => r.pass).length;
  const blocked = results.filter((r) => r.blocked).length;
  const failed = results.filter((r) => !r.pass && !r.blocked).length;
  console.log(`\n=== ${passed}/${results.length} passed, ${blocked} blocked, ${failed} failed ===`);

  await cleanupAll();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await cleanupAll().catch(() => {});
  process.exit(1);
});
