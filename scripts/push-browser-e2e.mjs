#!/usr/bin/env node
/**
 * Chrome desktop push notification E2E — login, settings push toggle, alert, cron match, notification.
 * Requires: production server (SW enabled), .env.local with Supabase + VAPID + CRON_SECRET.
 *
 * Usage: E2E_BASE_URL=http://localhost:3001 node scripts/push-browser-e2e.mjs
 */
import { chromium } from '../scraper/node_modules/playwright/index.mjs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import webpush from 'web-push';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

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
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = local.CRON_SECRET;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { users: [], listings: [], alerts: [] };
const TEST_KEYWORD = `PushE2E-${Date.now()}`;

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

async function createTestUser() {
  const email = `push-e2e-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'PushE2ePass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function browserCookiesForUser(email) {
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

  return cookieStore.map((c) => ({
    name: c.name,
    value: c.value,
    domain: new URL(BASE).hostname,
    path: c.options?.path ?? '/',
    sameSite: 'Lax',
    httpOnly: c.options?.httpOnly ?? false,
    expires: Math.floor(Date.now() / 1000) + (c.options?.maxAge ?? 3600),
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

async function main() {
  console.log(`=== Push browser E2E (${BASE}) ===\n`);

  if (!local.NEXT_PUBLIC_VAPID_PUBLIC_KEY || local.NEXT_PUBLIC_VAPID_PUBLIC_KEY.startsWith('<')) {
    throw new Error('Fix NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local (rebuild after fix)');
  }

  const user = await createTestUser();
  const cookies = await browserCookiesForUser(user.email);
  record('login via magic link OTP', true, user.email.split('@')[0]);

  const profileDir = mkdtempSync(`${tmpdir()}/push-e2e-chrome-`);
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let matchListingId = null;

  try {
    await context.grantPermissions(['notifications'], { origin: BASE });
    await context.addCookies(cookies);
    const page = context.pages()[0] ?? (await context.newPage());

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`  [browser error] ${msg.text()}`);
      }
    });

    await page.goto(`${BASE}/settings?tab=alerts`, { waitUntil: 'networkidle' });
    record('settings page loads (Impostazioni)', true, page.url());

    const loggedIn = await page.getByText('Crea avviso').first().isVisible().catch(() => false);
    record('logged in — alert create button visible', loggedIn);
    if (!loggedIn) throw new Error('Not logged in on settings page');

    const drawerAlreadyOpen = await page.getByText('Nuovo avviso').isVisible().catch(() => false);
    if (!drawerAlreadyOpen) {
      await page.getByText('Crea avviso').first().click();
    }
    await page.getByText('Nuovo avviso').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByPlaceholder('es. bici, divano, lampada…').fill(TEST_KEYWORD);
    await page.getByRole('button', { name: 'Centro Storico' }).click();
    await page.getByRole('button', { name: 'Salva avviso' }).click();
    await page.getByText('Avviso creato').first().waitFor({ timeout: 10000 });
    record('alert created (keyword + zone)', true, TEST_KEYWORD);

    const { data: alerts } = await admin.from('alerts').select('id').eq('user_id', user.id);
    if (alerts?.[0]?.id) cleanup.alerts.push(alerts[0].id);

    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    await page.waitForFunction(
      () =>
        'serviceWorker' in navigator &&
        navigator.serviceWorker.ready.then((reg) => Boolean(reg.active)),
      undefined,
      { timeout: 20000 },
    );
    await page.waitForTimeout(1500);

    const pushToggle = page.getByLabel(/Notifiche push/i);
    await pushToggle.waitFor({ state: 'visible', timeout: 10000 });
    const pushEnabled = await pushToggle.isChecked();
    if (!pushEnabled) {
      await pushToggle.click({ force: true });
    }
    await page.waitForTimeout(5000);

    const pushError = await page.getByText(/Impossibile attivare|non configurate|non supportate/i).isVisible().catch(() => false);
    record('push toggle enabled without UI error', !pushError, pushError ? 'error shown' : 'ok');

    const subState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { hasSubscription: false, reason: 'no-sw' };
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return {
        hasSubscription: Boolean(sub),
        endpoint: sub?.endpoint?.slice(0, 80),
        permission: Notification.permission,
      };
    });
    record(
      'browser push subscription active',
      subState.hasSubscription,
      JSON.stringify(subState),
    );

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', user.id);
    const hasRealSub = (subs?.length ?? 0) > 0;
    record('push subscription saved in DB', hasRealSub, subs?.[0]?.endpoint?.slice(0, 60) ?? 'none');

    if (hasRealSub && local.VAPID_PUBLIC_KEY && local.VAPID_PRIVATE_KEY && local.VAPID_SUBJECT) {
      webpush.setVapidDetails(local.VAPID_SUBJECT, local.VAPID_PUBLIC_KEY, local.VAPID_PRIVATE_KEY);
      const { data: subRow } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      try {
        await webpush.sendNotification(
          { endpoint: subRow.endpoint, keys: { p256dh: subRow.p256dh, auth: subRow.auth } },
          JSON.stringify({ title: 'PushE2E ping', body: 'pre-cron test', url: '/settings' }),
        );
        record('web-push send accepted by FCM', true);
        await page.waitForTimeout(6000);
        const pingNotifs = await page.evaluate(async () => {
          const reg = await navigator.serviceWorker.ready;
          return (await reg.getNotifications()).map((n) => n.title);
        });
        record('SW shows notification after FCM push', pingNotifs.length > 0, pingNotifs.join(', ') || 'none');
      } catch (error) {
        record(
          'web-push send accepted by FCM',
          false,
          `${error.statusCode ?? '?'} ${error.body ?? error.message}`,
        );
      }
    }

    const matchListing = {
      id: randomUUID(),
      source: 'ugc',
      external_id: randomUUID(),
      title: `${TEST_KEYWORD} free sofa regalo`,
      photo_url: 'https://example.com/push-e2e.jpg',
      external_url: `/listing/${randomUUID()}`,
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
    const { error: insErr } = await admin.from('listings').insert(matchListing);
    record('test listing inserted', !insErr, matchListing.title.slice(0, 40));
    cleanup.listings.push(matchListing.id);
    matchListingId = matchListing.id;

    await page.waitForTimeout(800);

    const cronRes = await fetch(`${BASE}/api/cron/match-alerts`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const cronJson = await cronRes.json().catch(() => ({}));
    record('cron match-alerts ran', cronRes.ok, `processed=${cronJson.processed ?? '?'}`);

    await page.waitForTimeout(6000);

    const swNotifications = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return [];
      const reg = await navigator.serviceWorker.ready;
      const notifications = await reg.getNotifications();
      return notifications.map((n) => ({ title: n.title, body: n.body, data: n.data }));
    });
    record(
      'OS / SW notification received after cron',
      swNotifications.length > 0,
      swNotifications[0]?.title ?? 'none',
    );

    const unreadRes = await page.request.get(`${BASE}/api/alerts/matches/unread-count`);
    const unreadJson = await unreadRes.json();
    record('unread match count > 0', (unreadJson.count ?? 0) > 0, `count=${unreadJson.count ?? 0}`);

    const notificationShown = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { shown: false, reason: 'no-sw' };
      const reg = await navigator.serviceWorker.ready;
      const perm = Notification.permission;
      return {
        shown: perm === 'granted',
        permission: perm,
        hasSubscription: Boolean(await reg.pushManager.getSubscription()),
      };
    });
    record(
      'browser push permission granted',
      notificationShown.permission === 'granted',
      JSON.stringify(notificationShown),
    );

    const pushReceived = await page.evaluate(async (listingId) => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      return true;
    }, matchListingId);

    record(
      'push pipeline ready for OS notification',
      pushReceived && cronRes.ok && (unreadJson.count ?? 0) > 0,
      'match created + subscription active',
    );

    await page.goto(`${BASE}/listing/${matchListingId}`, { waitUntil: 'networkidle' });
    const onListing = page.url().includes(`/listing/${matchListingId}`);
    record('notification target URL opens listing detail', onListing, page.url());
  } finally {
    await context.close();
    rmSync(profileDir, { recursive: true, force: true });
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== ${passed}/${results.length} passed, ${failed} failed ===`);
  console.log('\nManual check: OS notification should appear in system tray after cron.');
  console.log('Click notification → should open listing detail.');

  await cleanupAll();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await cleanupAll().catch(() => {});
  process.exit(1);
});
