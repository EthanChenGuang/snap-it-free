#!/usr/bin/env node
/**
 * Build DataImpulse residential PROXY_URL for Italy and store via configure-proxy-chain.
 *
 * Usage:
 *   DATAIMPULSE_LOGIN=user DATAIMPULSE_PASSWORD=secret node scripts/configure-dataimpulse-proxy.mjs
 *   node scripts/configure-dataimpulse-proxy.mjs LOGIN PASSWORD
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const login = (process.argv[2] ?? process.env.DATAIMPULSE_LOGIN)?.trim();
const password = (process.argv[3] ?? process.env.DATAIMPULSE_PASSWORD)?.trim();

if (!login || !password) {
  console.error('Provide DataImpulse proxy login and password.');
  console.error('  DATAIMPULSE_LOGIN=... DATAIMPULSE_PASSWORD=... node scripts/configure-dataimpulse-proxy.mjs');
  process.exit(1);
}

const port = process.env.DATAIMPULSE_PORT?.trim() || '823';
const country = process.env.DATAIMPULSE_COUNTRY?.trim() || 'it';
const username = login.includes('__cr.') ? login : `${login}__cr.${country}`;
const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@gw.dataimpulse.com:${port}`;

console.log('[configure-dataimpulse-proxy] Italy residential gateway (credentials masked in logs)');
console.log(`  host: gw.dataimpulse.com:${port}`);

const chainScript = join(__dirname, 'configure-proxy-chain.mjs');
const result = spawnSync(process.execPath, ['--import', 'tsx', chainScript], {
  stdio: 'inherit',
  env: { ...process.env, PROXY_URL_DATAIMPULSE: proxyUrl },
});

process.exit(result.status ?? 1);
