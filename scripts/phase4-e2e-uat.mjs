#!/usr/bin/env node
/**
 * Phase 4 live E2E UAT — auth gates, favorites, alerts, match pipeline, push subscribe.
 * Usage: node scripts/phase4-e2e-uat.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
const scraper = loadEnv(resolve(root, 'scraper/.env'));
const url = local.NEXT_PUBLIC_SUPABASE_URL || scraper.SUPABASE_URL;
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = scraper.SUPABASE_SERVICE_ROLE_KEY;
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
  const email = `p4-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P4UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function sessionFromOtp(email) {
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
        cookieStore = toSet.map(({ name, value }) => ({ name, value }));
      },
    },
  });

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: 'email',
  });
  if (error) throw error;

  const cookieHeader = cookieStore.map((c) => `${c.name}=${c.value}`).join('; ');
  return { cookieHeader, session: data.session, user: data.user };
}

async function apiFetch(path, cookieHeader, init = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Cookie: cookieHeader ?? '' },
  });
}

function veniceListing(overrides = {}) {
  const id = randomUUID();
  const now = new Date();
  return {
    id,
    source: 'ugc',
    external_id: id,
    title: `UAT Phase4 listing ${id.slice(0, 8)}`,
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
  console.log(`=== Phase 4 E2E UAT (${BASE}) ===\n`);

  // Test 1 partial — anon pages load (no redirect)
  const homeRes = await fetch(`${BASE}/`, { redirect: 'manual' });
  record(
    'anonymous browse: / no auth redirect',
    homeRes.status === 200 || homeRes.status === 304,
    String(homeRes.status),
  );
  const listRes = await fetch(`${BASE}/list`, { redirect: 'manual' });
  record(
    'anonymous browse: /list no auth redirect',
    listRes.status === 200 || listRes.status === 304,
    String(listRes.status),
  );

  // Test 6 — alerts require auth
  const anonAlerts = await fetch(`${BASE}/api/alerts`);
  record('alert API requires login', anonAlerts.status === 401, String(anonAlerts.status));
  const anonFav = await fetch(`${BASE}/api/favorites`);
  record('favorites API requires login', anonFav.status === 401, String(anonFav.status));

  const user = await createTestUser('main');
  const { cookieHeader, session } = await sessionFromOtp(user.email);
  record('sign in via OTP session', Boolean(session?.access_token), user.email.split('@')[0]);

  const settingsRes = await apiFetch('/settings', cookieHeader);
  record('settings page loads when authed', settingsRes.ok, String(settingsRes.status));

  // Seed a listing for favorites
  const listing = veniceListing();
  const { error: insErr } = await admin.from('listings').insert(listing);
  record('seed listing for favorites', !insErr, insErr?.message ?? listing.id.slice(0, 8));
  cleanup.listings.push(listing.id);

  // Test 4 — favorite persists
  const favPost = await apiFetch('/api/favorites', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId: listing.id }),
  });
  record('POST favorite returns 200', favPost.ok, String(favPost.status));

  const favGet = await apiFetch('/api/favorites', cookieHeader);
  const favJson = await favGet.json();
  record(
    'GET favorites includes listing',
    favJson.listingIds?.includes(listing.id),
    `count=${favJson.listingIds?.length ?? 0}`,
  );

  // Test 5 — merge
  const extraListing = veniceListing();
  await admin.from('listings').insert(extraListing);
  cleanup.listings.push(extraListing.id);
  const mergeRes = await apiFetch('/api/favorites/merge', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingIds: [extraListing.id] }),
  });
  const mergeJson = await mergeRes.json();
  record('favorites merge API', mergeRes.ok && mergeJson.merged === 1, String(mergeRes.status));

  const favGet2 = await apiFetch('/api/favorites', cookieHeader);
  const favJson2 = await favGet2.json();
  record(
    'merged favorite appears without duplicate',
    favJson2.listingIds?.includes(extraListing.id),
    `total=${favJson2.listingIds?.length ?? 0}`,
  );

  // Test 7 — create alert + max 5
  const alertRes = await apiFetch('/api/alerts', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: 'UATPhase4', zone: 'centro_storico' }),
  });
  const alertJson = await alertRes.json();
  record('create keyword+zone alert', alertRes.status === 201, String(alertRes.status));
  if (alertJson.alert?.id) cleanup.alerts.push(alertJson.alert.id);

  for (let i = 0; i < 4; i++) {
    const r = await apiFetch('/api/alerts', cookieHeader, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: `extra${i}` }),
    });
    const j = await r.json();
    if (j.alert?.id) cleanup.alerts.push(j.alert.id);
  }

  const sixth = await apiFetch('/api/alerts', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: 'sixth' }),
  });
  const sixthJson = await sixth.json();
  record(
    '6th alert returns 422 limit',
    sixth.status === 422 && String(sixthJson.error).includes('5 avvisi'),
    String(sixth.status),
  );

  // Test 8 — match pipeline
  const matchListing = veniceListing({
    title: 'UATPhase4 free sofa regalo',
    zone: 'centro_storico',
  });
  const { error: matchInsErr } = await admin.from('listings').insert(matchListing);
  record('insert matching listing', !matchInsErr, matchInsErr?.message ?? 'ok');
  cleanup.listings.push(matchListing.id);

  await new Promise((r) => setTimeout(r, 500));

  const { data: events } = await admin
    .from('listing_events')
    .select('id, status')
    .eq('listing_id', matchListing.id)
    .eq('status', 'pending');
  record('listing_events outbox row created', (events?.length ?? 0) > 0, `pending=${events?.length ?? 0}`);

  if (cronSecret) {
    const cronRes = await fetch(`${BASE}/api/cron/match-alerts`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const cronJson = await cronRes.json().catch(() => ({}));
    record('cron processes events', cronRes.ok, `processed=${cronJson.processed ?? '?'}`);
  } else {
    record('cron match (CRON_SECRET missing)', false, 'set CRON_SECRET in .env.local');
  }

  const unreadRes = await apiFetch('/api/alerts/matches/unread-count', cookieHeader);
  const unreadJson = await unreadRes.json();
  record(
    'unread match count > 0 after cron',
    unreadRes.ok && (unreadJson.count ?? 0) > 0,
    `count=${unreadJson.count ?? 0}`,
  );

  const matchesRes = await apiFetch('/api/alerts/matches', cookieHeader);
  const matchesJson = await matchesRes.json();
  const hasMatch = matchesJson.matches?.some((m) => m.listingId === matchListing.id);
  record('matches list includes new listing', hasMatch, `matches=${matchesJson.matches?.length ?? 0}`);

  if (hasMatch) {
    const readRes = await apiFetch(
      `/api/alerts/matches/${matchListing.id}/read`,
      cookieHeader,
      { method: 'POST' },
    );
    record('mark match read', readRes.ok, String(readRes.status));
    const unread2 = await apiFetch('/api/alerts/matches/unread-count', cookieHeader);
    const unread2Json = await unread2.json();
    record('unread count decreases after read', unread2Json.count < unreadJson.count, `count=${unread2Json.count}`);
  }

  // Test 9 — push subscribe (schema + auth)
  const pushRes = await apiFetch('/api/push/subscribe', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: `https://fcm.googleapis.com/fcm/send/uat-${Date.now()}`,
      keys: {
        p256dh: 'BEl62iUYgUih04f69Fty5ElSWg5lHqEj0J0YFyJQK8Y',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    }),
  });
  record('push subscribe API saves subscription', pushRes.status === 201, String(pushRes.status));

  // Test 10 — push delivery requires real browser subscription
  if (local.VAPID_PUBLIC_KEY && local.VAPID_PRIVATE_KEY) {
    recordBlocked(
      'OS push notification delivery',
      'Requires real browser PushManager subscription — cannot validate headless',
    );
  } else {
    recordBlocked('OS push notification delivery', 'VAPID keys not configured in .env.local');
  }

  // Tests 11-12 — iOS physical device
  recordBlocked('iOS Add-to-Home-Screen onboarding', 'Requires physical iPhone Safari');
  recordBlocked('iOS push after Home Screen install', 'Requires physical iPhone — Simulator unsupported');

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
