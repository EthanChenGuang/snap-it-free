#!/usr/bin/env node
/**
 * Build Decodo (formerly Smartproxy) residential PROXY_URL for Italy and store via configure-proxy.
 *
 * Dashboard: decodo.com → Residential Proxies → Authentication → copy username + password
 *
 * Usage:
 *   DECODO_USERNAME=myuser DECODO_PASSWORD=secret node scripts/configure-decodo-proxy.mjs
 *   node scripts/configure-decodo-proxy.mjs myuser secret
 *
 * Options (env):
 *   DECODO_CITY=venice|padova|rome  — optional city geo (with country-it)
 *   DECODO_PORT=7000                — default backconnect port
 *   DECODO_SESSION=abc123           — optional sticky session id (omit for rotating)
 *   DECODO_SESSION_MINUTES=30       — with DECODO_SESSION, up to 1440
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rawUser = (process.argv[2] ?? process.env.DECODO_USERNAME)?.trim();
const password = (process.argv[3] ?? process.env.DECODO_PASSWORD)?.trim();

if (!rawUser || !password) {
  console.error('Provide Decodo proxy username and password.');
  console.error('  DECODO_USERNAME=... DECODO_PASSWORD=... node scripts/configure-decodo-proxy.mjs');
  console.error('  node scripts/configure-decodo-proxy.mjs USERNAME PASSWORD');
  process.exit(1);
}

const port = process.env.DECODO_PORT?.trim() || '7000';
const city = process.env.DECODO_CITY?.trim().toLowerCase().replace(/\s+/g, '_');
const sessionId = process.env.DECODO_SESSION?.trim();
const sessionMinutes = process.env.DECODO_SESSION_MINUTES?.trim();

function normalizeDecodoUser(input) {
  let user = input.trim();
  if (user.startsWith('user-')) {
    user = user.slice(5);
  }
  const geoIdx = user.search(/-(country|city|session|sessionduration|continent|asn|state|zip)-/);
  if (geoIdx !== -1) {
    user = user.slice(0, geoIdx);
  }
  return user;
}

const baseUser = normalizeDecodoUser(rawUser);
const parts = ['user', baseUser, 'country-it'];

if (city) {
  parts.push(`city-${city}`);
}

if (sessionId) {
  parts.push(`session-${sessionId}`);
  if (sessionMinutes) {
    parts.push(`sessionduration-${sessionMinutes}`);
  }
}

const username = parts.join('-');
const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@gate.decodo.com:${port}`;

console.log('[configure-decodo-proxy] Italy residential backconnect (credentials masked in logs)');
console.log(`  host: gate.decodo.com:${port}`);
console.log(`  username pattern: ${username}`);
if (!sessionId) {
  console.log('  mode: rotating (new IP per request)');
} else {
  console.log(`  mode: sticky session ${sessionId}${sessionMinutes ? `, ${sessionMinutes} min` : ''}`);
}

const configureScript = join(__dirname, 'configure-proxy.mjs');
const result = spawnSync(process.execPath, ['--import', 'tsx', configureScript, proxyUrl], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
