#!/usr/bin/env node
/**
 * Phase 14 autonomous UAT — DND settings, delete account, Stitch visual checks.
 * Usage: E2E_BASE_URL=http://localhost:3000 node scripts/phase14-uat-automation.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3003';
const OUT = resolve(root, '.planning/phases/14-settings-consumer-parity/14-uat-results.json');

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
  const email = `p14-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P14UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function apiCookieHeader(email) {
  const anon = createClient(url, anonKey);
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: 'P14UatPass123!',
  });
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
  return `sb-${projectRef}-auth-token=base64-${Buffer.from(sessionPayload).toString('base64')}`;
}

async function testPhaseGate() {
  console.log('\n--- Phase gate suite + lint ---\n');
  try {
    execSync('npm run test', { cwd: root, stdio: 'pipe' });
    record('T21', 'Full vitest suite green (npm run test)', true);
  } catch (e) {
    record('T21', 'Full vitest suite green (npm run test)', false, String(e.stderr ?? e.message).slice(-200));
  }
  try {
    execSync('npm run lint', { cwd: root, stdio: 'pipe' });
    record('T22', 'TypeScript lint green (npm run lint)', true);
  } catch (e) {
    record('T22', 'TypeScript lint green (npm run lint)', false, String(e.stderr ?? e.message).slice(-200));
  }
  try {
    execSync(
      'npx vitest run lib/user/notification-prefs.test.ts lib/account/delete-account.test.ts lib/alerts/process-events.test.ts messages/key-parity.test.ts',
      { cwd: root, stdio: 'pipe' },
    );
    record('T23', 'Phase-scoped vitest suite green (27 tests)', true);
  } catch (e) {
    record('T23', 'Phase-scoped vitest suite green (27 tests)', false, String(e.stderr ?? e.message).slice(-200));
  }
}

async function cleanupAll() {
  for (const listingId of cleanup.listings) {
    await admin.from('listings').delete().eq('id', listingId);
  }
  for (const userId of cleanup.users) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      // user may have self-deleted in delete-account test
    }
  }
}

async function testRemoteSchema() {
  console.log('\n--- Remote schema (migration 022) ---\n');
  const { error: selectErr } = await admin.from('user_notification_prefs').select('user_id').limit(0);
  record('T1', 'user_notification_prefs table exists on remote Supabase', !selectErr, selectErr?.message ?? 'select ok');

  const { error: rpcErr } = await admin.rpc('delete_account_data', { target_user_id: randomUUID() });
  const missingFn = /Could not find the function|function .* does not exist|PGRST202/i.test(rpcErr?.message ?? '');
  record('T2', 'delete_account_data RPC exists on remote Supabase', !missingFn, rpcErr?.message?.slice(0, 80) ?? 'rpc callable');
}

async function testRegressionDiff() {
  console.log('\n--- Settings regression diff ---\n');
  const files = [
    'components/settings/ZonesSection.tsx',
    'components/settings/GeneralSection.tsx',
    'components/settings/LanguageSection.tsx',
    'lib/pwa/ios-detect.ts',
    'lib/pwa/usePushSubscribe.ts',
  ];
  for (const f of files) {
    const bytes = execSync(`git diff 5e2e32d -- ${f} | wc -c`, { cwd: root, encoding: 'utf8' }).trim();
    record('T3', `${f} zero diff from baseline`, bytes === '0', `${bytes} bytes changed`);
  }
}

async function testCleanupOrder() {
  console.log('\n--- D-14 cleanup order ---\n');
  const src = readFileSync(resolve(root, 'components/settings/AccountSection.tsx'), 'utf8');
  const block = src.slice(src.indexOf('if (!res.ok)'), src.indexOf('} catch {'));
  const resetIdx = block.indexOf('resetLocalAppData()');
  const favIdx = block.indexOf('FAVORITES_CHANGE_EVENT');
  const pass = resetIdx > -1 && favIdx > resetIdx;
  record('T4', 'AccountSection resets local data before event dispatches', pass, `reset@${resetIdx}, fav@${favIdx}`);
}

async function authCookieHeader(email) {
  return apiCookieHeader(email);
}

function normalizeDbTime(value) {
  return String(value ?? '').slice(0, 5);
}

async function testDndApiAutoSave() {
  console.log('\n--- DND API auto-save ---\n');
  const user = await createTestUser('dnd-api');
  const cookieHeader = await authCookieHeader(user.email);

  const getRes = await fetch(`${BASE}/api/user/notification-prefs`, {
    headers: { Cookie: cookieHeader },
  });
  const defaults = await getRes.json();
  record(
    'T5',
    'GET /api/user/notification-prefs returns D-08 defaults for new user',
    getRes.ok && defaults.dndEnabled === false && defaults.quietStart === '22:00',
    JSON.stringify(defaults),
  );

  const patch1 = await fetch(`${BASE}/api/user/notification-prefs`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dndEnabled: true, quietStart: '21:30', quietEnd: '08:00' }),
  });
  record('T6', 'PATCH enables DND and persists quiet hours', patch1.ok, String(patch1.status));

  const { data: prefs1 } = await admin
    .from('user_notification_prefs')
    .select('dnd_enabled, quiet_start, quiet_end')
    .eq('user_id', user.id)
    .maybeSingle();
  record(
    'T7',
    'DND toggle + time values saved in user_notification_prefs',
    prefs1?.dnd_enabled === true && normalizeDbTime(prefs1?.quiet_start) === '21:30',
    JSON.stringify(prefs1),
  );

  const patch2 = await fetch(`${BASE}/api/user/notification-prefs`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dndEnabled: true, quietStart: '23:15', quietEnd: '08:00' }),
  });
  record('T8', 'PATCH updates quiet_start without resetting dnd_enabled', patch2.ok, String(patch2.status));

  const { data: prefs2 } = await admin
    .from('user_notification_prefs')
    .select('quiet_start, dnd_enabled')
    .eq('user_id', user.id)
    .maybeSingle();
  record(
    'T9',
    'Time picker value auto-saved server-side',
    normalizeDbTime(prefs2?.quiet_start) === '23:15' && prefs2?.dnd_enabled === true,
    JSON.stringify(prefs2),
  );
}

async function testDndUiStructure() {
  console.log('\n--- DND UI structure ---\n');
  const notificationsSrc = readFileSync(resolve(root, 'components/settings/NotificationsSection.tsx'), 'utf8');
  record(
    'T10',
    'DND block gated on pushEnabled && !dndLoading in NotificationsSection',
    notificationsSrc.includes('{pushEnabled && !dndLoading && (') &&
      notificationsSrc.includes('messages.settings.dnd.title'),
  );
  record(
    'T11',
    'DND time pickers render when dndPrefs.dndEnabled is true',
    notificationsSrc.includes('{dndPrefs.dndEnabled && (') &&
      notificationsSrc.includes('type="time"'),
  );
}

async function testDeleteAccountFlow() {
  console.log('\n--- Delete account API + UX wiring ---\n');
  const user = await createTestUser('delete');
  const listingId = randomUUID();
  await admin.from('listings').insert({
    id: listingId,
    source: 'ugc',
    external_id: listingId,
    title: 'P14 claimed listing',
    photo_url: 'https://example.com/uat.jpg',
    external_url: `/listing/${listingId}`,
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    status: 'claimed',
    owner_user_id: user.id,
    posted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
  });
  cleanup.listings.push(listingId);

  const cookieHeader = await apiCookieHeader(user.email);

  const getRes = await fetch(`${BASE}/api/user/delete`, { headers: { Cookie: cookieHeader } });
  const getBody = await getRes.json();
  record(
    'T12',
    'GET /api/user/delete returns activeClaims for claimed listings',
    getRes.ok && getBody.activeClaims === 1,
    JSON.stringify(getBody),
  );

  const accountSrc = readFileSync(resolve(root, 'components/settings/AccountSection.tsx'), 'utf8');
  record(
    'T13',
    'AccountSection uses two-step inline confirm pattern',
    accountSrc.includes('if (!confirming)') &&
      accountSrc.includes('confirmDelete') &&
      accountSrc.includes('onBlur={() => setConfirming(false)}'),
  );

  const postRes = await fetch(`${BASE}/api/user/delete`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  record('T14', 'POST /api/user/delete removes account', postRes.ok, String(postRes.status));

  const idx = cleanup.users.indexOf(user.id);
  if (idx >= 0) cleanup.users.splice(idx, 1);

  const { data: deletedUser } = await admin.auth.admin.getUserById(user.id);
  record('T15', 'Supabase user removed after delete', !deletedUser?.user, deletedUser?.user?.email ?? 'gone');
}

async function testStitchVisual() {
  console.log('\n--- Stitch visual tokens (source contract) ---\n');
  const accountSrc = readFileSync(resolve(root, 'components/settings/AccountSection.tsx'), 'utf8');
  const settingsSrc = readFileSync(resolve(root, 'components/settings/SettingsPageClient.tsx'), 'utf8');
  const uiSrc = readFileSync(resolve(root, 'components/settings/SettingsUi.tsx'), 'utf8');

  record(
    'T16',
    'Account danger card uses Stitch error border/background tokens',
    accountSrc.includes('border-error/20 bg-error-container/30'),
  );
  record(
    'T17',
    'SettingsCard uses flat border surface (no shadow utilities)',
    uiSrc.includes('rounded-lg border border-outline-variant bg-surface-container-lowest') &&
      !uiSrc.includes('shadow-lg') &&
      !uiSrc.includes('shadow-xl'),
  );
  record(
    'T18',
    'Account section between Language and Advanced in SettingsPageClient',
    settingsSrc.indexOf('<LanguageSection />') < settingsSrc.indexOf('<AccountSection />') &&
      settingsSrc.indexOf('<AccountSection />') < settingsSrc.indexOf('<AdvancedSection />'),
  );
}

async function testDeleteIdempotency() {
  console.log('\n--- POST delete idempotency ---\n');
  const user = await createTestUser('idempotent');
  const cookieHeader = await apiCookieHeader(user.email);

  const res1 = await fetch(`${BASE}/api/user/delete`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  record('T19', 'First POST /api/user/delete succeeds', res1.ok, String(res1.status));

  const res2 = await fetch(`${BASE}/api/user/delete`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  record('T20', 'Second POST returns 401 after user deleted', res2.status === 401, String(res2.status));

  const idx = cleanup.users.indexOf(user.id);
  if (idx >= 0) cleanup.users.splice(idx, 1);
}

async function main() {
  console.log(`Phase 14 UAT automation — base ${BASE}\n`);
  try {
    await testRemoteSchema();
    await testRegressionDiff();
    await testCleanupOrder();
    await testDndApiAutoSave();
    await testDndUiStructure();
    await testDeleteAccountFlow();
    await testStitchVisual();
    await testDeleteIdempotency();
    await testPhaseGate();
  } finally {
    await cleanupAll();
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  writeFileSync(OUT, JSON.stringify({ base: BASE, passed, total: results.length, results, failed }, null, 2));
  console.log(`\n${passed}/${results.length} passed`);
  console.log(`Results: ${OUT}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
