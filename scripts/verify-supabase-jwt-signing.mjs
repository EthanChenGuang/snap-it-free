#!/usr/bin/env node
/**
 * End-to-end Supabase JWT signing migration probe.
 *
 * Usage:
 *   node scripts/verify-supabase-jwt-signing.mjs
 *
 * Loads .env.local then .env via dotenv.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = resolve(import.meta.dirname, '..');
for (const file of ['.env.local', '.env']) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}

const projectRef = 'wnerhajyjjmrtsdmdpzu';
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim() ||
  `https://${projectRef}.supabase.co`;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const legacyJwt =
  process.env.SUPABASE_SERVICE_ROLE_JWT?.trim() ||
  process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY?.trim();

function decodeJwtHeader(token) {
  const [headerB64] = token.split('.');
  if (!headerB64) return null;
  const json = Buffer.from(headerB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
}

function classifyKey(token) {
  if (!token) return { kind: 'missing' };
  if (token.startsWith('sb_publishable_')) return { kind: 'publishable' };
  if (token.startsWith('sb_secret_')) return { kind: 'secret' };
  if (token.startsWith('eyJ')) {
    try {
      const header = decodeJwtHeader(token);
      return { kind: 'legacy-jwt', alg: header?.alg ?? 'unknown', kid: header?.kid ?? '(none)' };
    } catch (err) {
      return { kind: 'invalid', error: String(err) };
    }
  }
  return { kind: 'unknown' };
}

function printSection(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

async function fetchJwks(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  return res.json();
}

async function probeListings(baseUrl, { label, apikey, authorization }) {
  const headers = { apikey };
  if (authorization) headers.Authorization = authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`;
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/listings_public?select=id&limit=1`, { headers });
  const body = await res.text();
  let message = '';
  try {
    message = JSON.parse(body).message ?? body.slice(0, 80);
  } catch {
    message = body.slice(0, 80);
  }
  return { label, status: res.status, ok: res.ok, message };
}

async function probeRpc(baseUrl, key, label) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/rpc/delete_account_data`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_user_id: '00000000-0000-0000-0000-000000000099' }),
  });
  const body = await res.text();
  return { label, status: res.status, ok: res.status === 204 || res.status === 200, message: body.slice(0, 80) };
}

async function mintSessionToken(baseUrl, anon, legacyServiceJwt) {
  if (!legacyServiceJwt?.startsWith('eyJ')) return null;
  const admin = createClient(baseUrl, legacyServiceJwt, { auth: { persistSession: false } });
  const email = `jwt-verify-${Date.now()}@snap-it-free.test`;
  const password = 'JwtVerifyPass123!';
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) {
    console.log(`  (session mint skipped: ${error.message})`);
    return null;
  }
  const anonClient = createClient(baseUrl, anon);
  const { data: session, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password });
  await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
  if (signInErr) {
    console.log(`  (session mint skipped: ${signInErr.message})`);
    return null;
  }
  return session.session.access_token;
}

async function main() {
  console.log('Supabase JWT signing probe (end-to-end)');
  console.log(`URL: ${url}`);

  printSection('JWKS (GoTrue verify keys)');
  const jwks = await fetchJwks(url);
  for (const key of jwks.keys ?? []) {
    console.log(`  alg=${key.alg} kid=${key.kid} kty=${key.kty}`);
  }

  printSection('Configured API keys (env)');
  for (const [label, key] of [
    ['anon', anonKey],
    ['service_role', serviceKey],
    ['legacy JWT fallback', legacyJwt],
  ]) {
    const c = classifyKey(key);
    if (c.kind === 'missing') console.log(`  ${label}: (not set)`);
    else if (c.kind === 'publishable') console.log(`  ${label}: sb_publishable`);
    else if (c.kind === 'secret') console.log(`  ${label}: sb_secret`);
    else if (c.kind === 'legacy-jwt') console.log(`  ${label}: legacy JWT alg=${c.alg}`);
    else console.log(`  ${label}: ${c.kind}`);
  }

  printSection('PostgREST probes');
  const probes = [];
  if (anonKey) {
    probes.push(await probeListings(url, { label: 'publishable (apikey only)', apikey: anonKey }));
  }
  if (serviceKey) {
    probes.push(await probeListings(url, { label: 'sb_secret (apikey+bearer)', apikey: serviceKey, authorization: serviceKey }));
    probes.push(await probeRpc(url, serviceKey, 'sb_secret RPC delete_account_data'));
  }
  if (legacyJwt?.startsWith('eyJ')) {
    probes.push(await probeListings(url, { label: 'legacy JWT (apikey+bearer)', apikey: legacyJwt, authorization: legacyJwt }));
    probes.push(await probeRpc(url, legacyJwt, 'legacy JWT RPC'));
  }

  const sessionToken = await mintSessionToken(url, anonKey, legacyJwt);
  if (sessionToken && anonKey) {
    const hdr = decodeJwtHeader(sessionToken);
    console.log(`  user session JWT: alg=${hdr?.alg} kid=${hdr?.kid}`);
    probes.push(
      await probeListings(url, {
        label: 'user ES256 session (publishable apikey + bearer session)',
        apikey: anonKey,
        authorization: sessionToken,
      }),
    );
  }

  let passCount = 0;
  for (const p of probes) {
    const mark = p.ok ? 'PASS' : 'FAIL';
    if (p.ok) passCount++;
    console.log(`  [${mark}] ${p.label}: HTTP ${p.status}${p.message ? ` — ${p.message}` : ''}`);
  }

  printSection('Verdict');
  const userSessionProbe = probes.find((p) => p.label.includes('user ES256'));
  const secretProbe = probes.find((p) => p.label.startsWith('sb_secret (apikey'));
  const publishableOk = probes.find((p) => p.label.includes('publishable'))?.ok ?? false;

  if (userSessionProbe?.ok && secretProbe?.ok && publishableOk) {
    console.log('  MIGRATION COMPLETE — PostgREST accepts ES256 sessions and sb_secret.');
    console.log('  Safe to revoke legacy JWT secret in Dashboard (after token expiry window).');
    return;
  }

  // "JWT issued at future" is a PostgREST-side stale-clock bug, not a signing mismatch:
  // an old-enough iat (legacy token) is accepted, and the sb_secret path sends no JWT at all.
  const staleClock = [userSessionProbe, secretProbe].some(
    (p) => p && !p.ok && /issued at future/i.test(p.message ?? ''),
  );

  if (staleClock) {
    console.log('  BLOCKED — PostgREST rejects fresh JWTs as "issued at future" (PGRST303).');
    console.log('  This is NOT a signing-key problem. Do not roll back the JWT migration.');
    console.log('  Action: Dashboard → Settings → General/Infrastructure → Restart project.');
    console.log('  Guide: docs/ops/supabase-jwt-signing-runbook.md');
    process.exitCode = 1;
    return;
  }

  if (userSessionProbe && !userSessionProbe.ok && publishableOk) {
    console.log('  INCOMPLETE — GoTrue issues ES256 but PostgREST rejects user sessions.');
    console.log('  Guide: docs/ops/supabase-jwt-signing-runbook.md');
    process.exitCode = 1;
    return;
  }

  if (secretProbe && !secretProbe.ok) {
    console.log('  INCOMPLETE — sb_secret rejected by PostgREST.');
    console.log('  Use legacy eyJ JWT via SUPABASE_SERVICE_ROLE_JWT as a stopgap.');
    console.log('  Guide: docs/ops/supabase-jwt-signing-runbook.md');
    process.exitCode = 1;
    return;
  }

  console.log('  REVIEW — see probe results above.');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
