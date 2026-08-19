#!/usr/bin/env node
/**
 * Phase 3 automated UAT — checks migration state and runs API/integration probes.
 * Usage: node scripts/phase3-uat-automation.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv(path) {
  try {
    const text = readFileSync(path, 'utf8');
    const out = {};
    for (const line of text.split('\n')) {
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
const serviceKey = scraper.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

async function tableExists(name) {
  const { error } = await admin.from(name).select('*').limit(0);
  if (!error) return true;
  return !String(error.message).includes('Could not find the table');
}

async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(0);
  return !error;
}

async function main() {
  console.log('=== Phase 3 migration state ===');
  record('listings table', await tableExists('listings'));
  record('listings_public view', await tableExists('listings_public'));
  record('owner_user_id column', await columnExists('listings', 'owner_user_id'));
  record('conversations table', await tableExists('conversations'));
  record('listing_reports table', await tableExists('listing_reports'));

  const migrationsOk =
    (await tableExists('listings_public')) &&
    (await columnExists('listings', 'owner_user_id')) &&
    (await tableExists('conversations')) &&
    (await tableExists('listing_reports'));

  if (!migrationsOk) {
    console.log('\n⚠ Migrations 006–009 not fully applied. Run:');
    console.log('  export SUPABASE_DB_PASSWORD=... && ./scripts/apply-phase3-migrations.sh');
    record('migrations 006-009 applied', false, 'blocked — need SUPABASE_DB_PASSWORD');
  } else {
    record('migrations 006-009 applied', true);
  }

  if (anon) {
    const { data, error, count } = await anon
      .from('listings_public')
      .select('id', { count: 'exact', head: true });
    record('anon read listings_public', !error, error?.message ?? `${count ?? data?.length ?? 0} rows visible`);
  }

  if (migrationsOk) {
    console.log('\n=== API probes (service role) ===');
    const { data: users, error: userErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    record('auth admin API', !userErr, userErr?.message ?? 'ok');

    const testEmail = `uat-${Date.now()}@snap-it-free.test`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      password: 'UatTestPass123!',
    });
    record('create test user', !createErr, createErr?.message ?? created.user?.id?.slice(0, 8));

    if (created?.user) {
      await admin.auth.admin.deleteUser(created.user.id);
    }
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== Summary: ${results.length - failed}/${results.length} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
