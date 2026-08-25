#!/usr/bin/env node
/**
 * Phase 3 browser/API E2E UAT — magic link session + Quick Post + EXIF.
 * Usage: node scripts/phase3-e2e-uat.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

function loadEnv(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      out[t.slice(0, i)] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
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

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { users: [], listings: [] };

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

function recordPartial(name, detail = '') {
  results.push({ name, pass: true, partial: true, detail });
  console.log(`~ ${name}${detail ? `: ${detail}` : ''} (partial)`);
}

async function createTestUser(label) {
  const email = `e2e-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'E2eTestPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function sessionFromMagicLink(email) {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${BASE}/auth/callback?next=/post` },
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
  return { cookieHeader, cookieStore, session: data.session, user: data.user };
}

async function apiFetch(path, cookieHeader, init = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Cookie: cookieHeader },
  });
}

async function makeGpsJpeg(path) {
  const buf = await sharp({
    create: { width: 120, height: 120, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .withMetadata({ exif: { IFD0: { Copyright: 'uat-gps-test' } } })
    .jpeg()
    .toBuffer();
  writeFileSync(path, buf);
  const meta = await sharp(buf).metadata();
  return { hadExif: Boolean(meta.exif) };
}

async function main() {
  console.log(`=== Phase 3 E2E UAT (${BASE}) ===\n`);

  const health = await fetch(`${BASE}/post`);
  record('dev server reachable', health.ok, String(health.status));

  const user = await createTestUser('quickpost');
  const { cookieHeader, session } = await sessionFromMagicLink(user.email);
  record('magic link OTP session established', Boolean(session?.access_token), user.email.split('@')[0]);
  record('SSR auth cookie captured', cookieHeader.includes('auth-token'), 'sb-*-auth-token');

  const jpegPath = resolve(root, '.tmp-e2e-photo.jpg');
  const { hadExif } = await makeGpsJpeg(jpegPath);
  record('test JPEG has EXIF before upload', hadExif, 'metadata present');

  const form = new FormData();
  form.append('photo', new Blob([readFileSync(jpegPath)], { type: 'image/jpeg' }), 'gps-test.jpg');

  const uploadRes = await apiFetch('/api/ugc/upload', cookieHeader, { method: 'POST', body: form });
  const uploadJson = await uploadRes.json().catch(() => ({}));
  record('authenticated upload via session cookie', uploadRes.status === 200, `${uploadRes.status}`);

  if (uploadRes.status === 200 && uploadJson.photoUrl) {
    const stored = await fetch(uploadJson.photoUrl);
    const storedMeta = await sharp(Buffer.from(await stored.arrayBuffer())).metadata();
    record('EXIF stripped in Storage round-trip', !storedMeta.exif, storedMeta.exif ? 'EXIF present' : 'clean');
  }

  const listingBody = {
    title: `E2E Quick Post ${Date.now()}`,
    photoUrl: uploadJson.photoUrl ?? 'https://example.com/x.jpg',
    lat: 45.434,
    lng: 12.338,
    postCategory: 'arredamento-casalinghi',
  };

  const createRes = await apiFetch('/api/ugc/listings', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listingBody),
  });
  const createJson = await createRes.json().catch(() => ({}));
  record('Quick Post create listing (test 1)', createRes.status === 201, `id=${createJson.id?.slice(0, 8) ?? createJson.error}`);

  const secondRes = await apiFetch('/api/ugc/listings', cookieHeader, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...listingBody, title: `E2E second ${Date.now()}` }),
  });
  record('magic link session persists (test 2)', secondRes.status === 201 || secondRes.status === 429, String(secondRes.status));

  if (createJson.id) {
    cleanup.listings.push(createJson.id);
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: pub } = await anon.from('listings_public').select('id, source').eq('id', createJson.id).maybeSingle();
    record('listing in listings_public / map feed', pub?.id === createJson.id, pub?.source ?? 'missing');

    const detailRes = await fetch(`${BASE}/listing/${createJson.id}`);
    const detailHtml = await detailRes.text();
    record('UGC detail page renders', detailRes.ok, String(detailRes.status));
    record('detail omits Subito CTA', !/subito\.it|Vai su Subito/i.test(detailHtml), 'checked');
  }

  // Export session for browser Street Dump test
  const sessionPath = resolve(root, '.tmp-e2e-session.json');
  writeFileSync(sessionPath, JSON.stringify({ cookieHeader, access_token: session.access_token, refresh_token: session.refresh_token }));

  try { unlinkSync(jpegPath); } catch { /* ignore */ }

  for (const id of cleanup.listings) {
    await admin.from('listing_reports').delete().eq('listing_id', id);
    await admin.from('conversations').delete().eq('listing_id', id);
    await admin.from('listings').delete().eq('id', id);
  }
  for (const uid of cleanup.users) {
    await admin.auth.admin.deleteUser(uid);
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== E2E UAT: ${results.length - failed}/${results.length} passed ===`);
  console.log(`session file: ${sessionPath}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
