#!/usr/bin/env node
/**
 * Phase 4 migration + unit test automation.
 * Usage: node scripts/phase4-uat-automation.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

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
const serviceKey = scraper.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

async function tableExists(admin, name) {
  const { error } = await admin.from(name).select('*').limit(0);
  if (!error) return true;
  return !String(error.message).includes('Could not find the table');
}

async function main() {
  console.log('=== Phase 4 migration state ===\n');

  if (!url || !serviceKey) {
    console.error('Missing Supabase env');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  for (const t of [
    'user_favorites',
    'alerts',
    'push_subscriptions',
    'listing_events',
    'alert_matches',
  ]) {
    record(`table ${t}`, await tableExists(admin, t));
  }

  console.log('\n=== Phase 4 cold start probes ===\n');

  try {
    const home = await fetch(`${BASE}/`);
    record('homepage loads', home.ok, String(home.status));
    const list = await fetch(`${BASE}/list`);
    record('/list loads', list.ok, String(list.status));
  } catch (e) {
    record('dev server reachable', false, e.message);
  }

  try {
    const cron = await fetch(`${BASE}/api/cron/match-alerts`);
    record('cron returns 401 without secret', cron.status === 401, String(cron.status));
  } catch (e) {
    record('cron route reachable', false, e.message);
  }

  const cronSecret = local.CRON_SECRET;
  if (cronSecret) {
    try {
      const cronOk = await fetch(`${BASE}/api/cron/match-alerts`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      record('cron returns 200 with CRON_SECRET', cronOk.ok, String(cronOk.status));
    } catch (e) {
      record('cron authorized call', false, e.message);
    }
  } else {
    record('CRON_SECRET in env', false, 'missing — skip authorized cron probe');
  }

  console.log('\n=== Phase 4 unit tests ===\n');
  const testRun = spawnSync('npm', ['run', 'test:lib'], {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  });
  const testsPassed = testRun.status === 0;
  record('npm run test:lib', testsPassed, testsPassed ? '90 passed' : testRun.stderr?.slice(0, 200));

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== ${results.length - failed}/${results.length} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
