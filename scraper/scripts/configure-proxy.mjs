#!/usr/bin/env node
/**
 * Encrypt PROXY_URL and store in scraper_global_config.proxy_enc (D-20).
 * Also writes PROXY_URL to scraper/.env for worker bootstrap fallback.
 *
 * Usage:
 *   PROXY_URL='http://user:pass@host:port' node scripts/configure-proxy.mjs
 *   node scripts/configure-proxy.mjs 'http://user:pass@host:port'
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptProxy } from '../../lib/admin/crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scraperRoot = join(__dirname, '..');
const envPath = join(scraperRoot, '.env');

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Set it in scraper/.env or the environment.`);
    process.exit(1);
  }
  return value;
}

const proxyUrl = (process.argv[2] ?? process.env.PROXY_URL)?.trim();
if (!proxyUrl) {
  console.error('Provide PROXY_URL via env or first argument.');
  console.error("Example: PROXY_URL='http://user:pass@proxy.example:8080' node scripts/configure-proxy.mjs");
  process.exit(1);
}

if (!/^https?:\/\//.test(proxyUrl)) {
  console.error('PROXY_URL must be an http(s) URL (e.g. http://user:pass@host:port).');
  process.exit(1);
}

const secretsKey = requireEnv('SCRAPER_SECRETS_KEY');
const supabaseUrl = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const proxyEnc = encryptProxy(proxyUrl, secretsKey);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await supabase
  .from('scraper_global_config')
  .update({
    proxy_enc: proxyEnc,
    updated_at: new Date().toISOString(),
  })
  .eq('id', 1);

if (error) {
  console.error('Failed to update scraper_global_config:', error.message);
  process.exit(1);
}

let envContents = readFileSync(envPath, 'utf8');
if (/^PROXY_URL=/m.test(envContents)) {
  envContents = envContents.replace(/^PROXY_URL=.*$/m, `PROXY_URL=${proxyUrl}`);
} else {
  envContents = `${envContents.trimEnd()}\nPROXY_URL=${proxyUrl}\n`;
}
writeFileSync(envPath, envContents);

console.log('[configure-proxy] Stored encrypted proxy in scraper_global_config.proxy_enc');
console.log('[configure-proxy] Updated scraper/.env PROXY_URL (bootstrap fallback)');
console.log('[configure-proxy] Ensure SCRAPER_SECRETS_KEY is also set in .env.local for /admin/settings');
