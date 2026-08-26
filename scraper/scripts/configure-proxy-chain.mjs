#!/usr/bin/env node
/**
 * Resolve DataImpulse → Webshare → Decodo proxy chain and sync to DB + scraper/.env.
 *
 * Reads PROXY_URL_DATAIMPULSE / PROXY_URL_WEBSHARE / PROXY_URL_DECODO (or provider creds env),
 * legacy PROXY_URL, and encrypts the primary (first available) URL into proxy_enc.
 *
 * Usage:
 *   node scripts/configure-proxy-chain.mjs
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptProxy } from '../../lib/admin/crypto.js';
import { resolveProxyChain } from '../../lib/admin/proxy-chain.js';

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

const chain = resolveProxyChain();
if (chain.length === 0) {
  console.error('No proxy providers configured.');
  console.error('Set PROXY_URL_DATAIMPULSE, PROXY_URL_WEBSHARE, PROXY_URL_DECODO, or legacy PROXY_URL.');
  process.exit(1);
}

const primary = chain[0];
if (!primary) {
  process.exit(1);
}
const secretsKey = requireEnv('SCRAPER_SECRETS_KEY');
const supabaseUrl = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const proxyEnc = encryptProxy(primary.url, secretsKey);
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

function upsertEnvLine(key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (pattern.test(envContents)) {
    envContents = envContents.replace(pattern, line);
  } else {
    envContents = `${envContents.trimEnd()}\n${line}\n`;
  }
}

for (const entry of chain) {
  upsertEnvLine(`PROXY_URL_${entry.provider.toUpperCase()}`, entry.url);
}
upsertEnvLine('PROXY_URL', primary.url);

writeFileSync(envPath, envContents);

console.log('[configure-proxy-chain] Provider order (failover):');
for (const [index, entry] of chain.entries()) {
  console.log(`  ${index + 1}. ${entry.provider} — ${entry.hostMasked}${index === 0 ? ' (primary → proxy_enc)' : ''}`);
}
