#!/usr/bin/env node
/**
 * Detect Supabase JWT signing mismatch: GoTrue ES256 sessions vs legacy HS256 API keys.
 *
 * Usage:
 *   node scripts/verify-supabase-jwt-signing.mjs
 *   node scripts/verify-supabase-jwt-signing.mjs --session-token "<access_token>"
 *
 * Loads .env.local then .env via dotenv (same pattern as other scripts).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

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
const sessionArgIdx = process.argv.indexOf('--session-token');
const sessionToken =
  sessionArgIdx >= 0 ? process.argv[sessionArgIdx + 1]?.trim() : undefined;

function decodeJwtHeader(token) {
  const [headerB64] = token.split('.');
  if (!headerB64) {
    return null;
  }
  const padded = headerB64.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json);
}

function classifyKey(token) {
  if (!token) return { kind: 'missing' };
  if (token.startsWith('sb_publishable_')) return { kind: 'publishable' };
  if (token.startsWith('sb_secret_')) return { kind: 'secret' };
  if (token.startsWith('eyJ')) {
    try {
      const header = decodeJwtHeader(token);
      return {
        kind: 'legacy-jwt',
        alg: header?.alg ?? 'unknown',
        kid: header?.kid ?? '(none)',
      };
    } catch (err) {
      return { kind: 'invalid', error: String(err) };
    }
  }
  return { kind: 'unknown' };
}

function keySummary(token, label) {
  const classified = classifyKey(token);
  if (classified.kind === 'missing') {
    return { label, present: false };
  }
  if (classified.kind === 'publishable') {
    return { label, present: true, detail: 'sb_publishable (new API key, not a JWT)' };
  }
  if (classified.kind === 'secret') {
    return { label, present: true, detail: 'sb_secret (new API key, not a JWT)' };
  }
  if (classified.kind === 'legacy-jwt') {
    return { label, present: true, detail: `legacy JWT alg=${classified.alg} ${classified.kid}` };
  }
  return { label, present: true, error: classified.error ?? 'unrecognized key format' };
}

async function fetchJwks(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function probeRest(baseUrl, token, label) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/`, {
    headers: {
      apikey: token,
      Authorization: `Bearer ${token}`,
    },
  });
  return { label, status: res.status, ok: res.ok };
}

function printSection(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

async function main() {
  console.log('Supabase JWT signing probe');
  console.log(`URL: ${url}`);

  printSection('JWKS (GoTrue verify keys)');
  const jwks = await fetchJwks(url);
  for (const key of jwks.keys ?? []) {
    console.log(`  alg=${key.alg} kid=${key.kid} kty=${key.kty}`);
  }
  const jwksUsesEs256 = (jwks.keys ?? []).some((k) => k.alg === 'ES256');

  printSection('Configured API keys (env)');
  for (const summary of [keySummary(anonKey, 'anon'), keySummary(serviceKey, 'service_role')]) {
    if (!summary.present) {
      console.log(`  ${summary.label}: (not set)`);
    } else if (summary.error) {
      console.log(`  ${summary.label}: ${summary.error}`);
    } else {
      console.log(`  ${summary.label}: ${summary.detail}`);
    }
  }

  const anonKind = classifyKey(anonKey).kind;
  const serviceKind = classifyKey(serviceKey).kind;
  const usesNewApiKeys = anonKind === 'publishable' && serviceKind === 'secret';
  const usesLegacyHs256 = anonKind === 'legacy-jwt' && classifyKey(anonKey).alg === 'HS256';

  printSection('REST smoke');
  const probes = [];
  if (anonKey) {
    probes.push(await probeRest(url, anonKey, 'anon / publishable key'));
  }
  if (serviceKey) {
    probes.push(await probeRest(url, serviceKey, 'service_role / secret key'));
  }
  if (sessionToken) {
    probes.push(await probeRest(url, sessionToken, 'user session token'));
  } else {
    console.log('  (skip user session — pass --session-token to test logged-in JWT)');
  }
  for (const p of probes) {
    console.log(`  ${p.label}: HTTP ${p.status}${p.ok ? ' OK' : ''}`);
  }

  printSection('Verdict');
  if (jwksUsesEs256 && usesNewApiKeys) {
    console.log('  OK — ES256 JWKS + new publishable/secret API keys.');
    console.log('  Next: sign out and back in, then unfavorite on /favorites.');
    return;
  }
  if (jwksUsesEs256 && usesLegacyHs256) {
    console.log('  MISMATCH — GoTrue publishes ES256 JWKS but env API keys are HS256 legacy.');
    console.log('  Use Dashboard → API Keys → sb_publishable_ / sb_secret_ (not eyJ... JWTs).');
    console.log('  See: docs/ops/supabase-jwt-signing-runbook.md');
    process.exitCode = 1;
    return;
  }
  if (!jwksUsesEs256 && usesLegacyHs256) {
    console.log('  OK — legacy HS256 mode (JWKS empty or HS256-only).');
    return;
  }
  console.log('  REVIEW — mixed or unknown state; inspect JWKS + key prefixes manually.');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
