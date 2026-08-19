#!/usr/bin/env node
/**
 * Build Webshare backbone PROXY_URL for Italy and store via configure-proxy.
 *
 * Dashboard: Proxy List → Connection Method → Backbone (or Endpoint Generator)
 * Copy your base username + password from Webshare.
 *
 * Usage:
 *   WEBSHARE_USERNAME=abc WEBSHARE_PASSWORD=secret node scripts/configure-webshare-proxy.mjs
 *   node scripts/configure-webshare-proxy.mjs abc secret
 *
 * Options (env):
 *   WEBSHARE_CITY=venice|padova  — optional city geo (Rotating Residential only)
 *   WEBSHARE_PORT=80             — default 80 (also 1080, 3128, 9999–19999)
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseUser = (process.argv[2] ?? process.env.WEBSHARE_USERNAME)?.trim();
const password = (process.argv[3] ?? process.env.WEBSHARE_PASSWORD)?.trim();

if (!baseUser || !password) {
  console.error('Provide Webshare username and password.');
  console.error('  WEBSHARE_USERNAME=... WEBSHARE_PASSWORD=... node scripts/configure-webshare-proxy.mjs');
  console.error('  node scripts/configure-webshare-proxy.mjs USERNAME PASSWORD');
  process.exit(1);
}

const port = process.env.WEBSHARE_PORT?.trim() || '80';
const city = process.env.WEBSHARE_CITY?.trim().toLowerCase();

// Strip accidental suffix if user pasted a pre-built username
const userRoot = baseUser.replace(/-it(-.*)?$/, '');

const parts = [userRoot, 'it'];
if (city) {
  parts.push(`city_${city.replace(/\s+/g, '_')}`);
}
parts.push('rotate');

const username = parts.join('-');
const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@p.webshare.io:${port}`;

console.log('[configure-webshare-proxy] Italy rotating backbone URL (credentials masked in logs)');
console.log(`  host: p.webshare.io:${port}`);
console.log(`  username pattern: ${userRoot}-it${city ? `-city_${city.replace(/\s+/g, '_')}` : ''}-rotate`);

const configureScript = join(__dirname, 'configure-proxy.mjs');
const result = spawnSync(process.execPath, ['--import', 'tsx', configureScript, proxyUrl], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
