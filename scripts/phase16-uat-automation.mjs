#!/usr/bin/env node
/**
 * Phase 16 autonomous UAT — proxy cost tier admin UI + ADR cost ladder.
 * Usage: E2E_BASE_URL=http://localhost:3003 node scripts/phase16-uat-automation.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3003';
const OUT = resolve(
  root,
  '.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-uat-results.json',
);

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
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY || scraper.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { users: [], allowlistAdded: [] };

function record(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} [${id}] ${name}${detail ? `: ${detail}` : ''}`);
}

function recordBlocked(id, name, reason) {
  results.push({ id, name, pass: false, blocked: true, detail: reason });
  console.log(`⊘ [${id}] ${name}: ${reason}`);
}

async function createTestUser(label) {
  const email = `p16-uat-${label}-${Date.now()}@snap-it-free.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'P16UatPass123!',
  });
  if (error) throw error;
  cleanup.users.push(data.user.id);
  return { id: data.user.id, email };
}

async function sessionFromOtp(email) {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${BASE}/admin/settings` },
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

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: 'email',
  });
  if (error) throw error;

  const cookieHeader = cookieStore.map((c) => `${c.name}=${c.value}`).join('; ');
  return { cookieHeader };
}

async function apiFetch(path, cookieHeader, init = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { ...(init.headers ?? {}), Cookie: cookieHeader ?? '' },
  });
}

async function cleanupAll() {
  for (const email of cleanup.allowlistAdded) {
    await admin.from('operator_allowlist').delete().eq('email', email);
  }
  for (const userId of cleanup.users) {
    await admin.auth.admin.deleteUser(userId);
  }
}

function targetUrlCount(row) {
  if (Array.isArray(row.target_urls_snapshot) && row.target_urls_snapshot.length > 0) {
    return row.target_urls_snapshot.length;
  }
  return 0;
}

async function computeBlockedRatio7d() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  const { data, error } = await admin
    .from('scrape_runs')
    .select('blocked_url_count, target_urls_snapshot')
    .eq('source', 'subito')
    .gte('started_at', since.toISOString());

  if (error || !data) return { ratio: null, runs: 0, sumTarget: 0 };

  let sumBlocked = 0;
  let sumTarget = 0;
  for (const row of data) {
    sumBlocked += row.blocked_url_count ?? 0;
    sumTarget += targetUrlCount(row);
  }
  return {
    ratio: sumTarget > 0 ? sumBlocked / sumTarget : null,
    runs: data.length,
    sumTarget,
  };
}

function tierForRatio(ratio) {
  if (ratio === null) return 'insufficient_data';
  if (ratio < 0.5) return 'direct_free';
  if (ratio < 0.7) return 'webshare_budget';
  return 'residential_recommended';
}

const TIER_LABELS = {
  direct_free: '直连免费',
  webshare_budget: 'Webshare 经济档',
  residential_recommended: '住宅代理推荐',
  insufficient_data: '数据不足',
};

async function testUnitAndStatic() {
  console.log('\n--- Unit + static checks ---\n');
  try {
    execSync('npx vitest run lib/admin/proxy-cost-tier.test.ts', { cwd: root, stdio: 'pipe' });
    record('T0', 'proxy-cost-tier vitest (6 tests)', true);
  } catch (e) {
    record('T0', 'proxy-cost-tier vitest (6 tests)', false, String(e.stderr ?? e.message).slice(-200));
  }

  try {
    execSync('node --check scraper/scripts/run-direct-production-spike.mjs', { cwd: root, stdio: 'pipe' });
    record('T0b', 'run-direct-production-spike.mjs syntax', true);
  } catch (e) {
    record('T0b', 'run-direct-production-spike.mjs syntax', false, String(e.message).slice(-120));
  }

  const settingsSrc = readFileSync(resolve(root, 'components/admin/SettingsClient.tsx'), 'utf8');
  record(
    'T0c',
    'SettingsClient renders cost tier section',
    settingsSrc.includes('proxyCostTierLabel') &&
      settingsSrc.includes('proxyCostTierHint') &&
      settingsSrc.includes('blockedRatioDisplay'),
    'cost tier row wired',
  );

  const adr = readFileSync(resolve(root, 'docs/adr/015-production-proxy.md'), 'utf8');
  record(
    'T2',
    'ADR Cost ladder accepted addendum',
    adr.includes('Cost ladder (Phase 16)') &&
      adr.includes('Accepted addendum') &&
      adr.includes('optional by default') &&
      adr.includes('recommended when'),
    'optional vs recommended language',
  );
  record(
    'T2b',
    'ADR documents 50% gate threshold',
    adr.includes('blocked_ratio_7d ≥ 0.5') || adr.includes('blocked_ratio_7d ≥ 50%'),
    '50% gate',
  );
}

async function testAdminSettingsUi() {
  console.log('\n--- Admin /admin/settings (operator) ---\n');

  let serverUp = false;
  try {
    const ping = await fetch(`${BASE}/`, { redirect: 'manual' });
    serverUp = ping.status === 200 || ping.status === 307;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    recordBlocked('T1', 'Admin Settings cost tier display', `Server not reachable at ${BASE}`);
    return;
  }

  const operator = await createTestUser('operator');
  const { error: allowErr } = await admin
    .from('operator_allowlist')
    .insert({ email: operator.email.toLowerCase() });
  record('T1a', 'seed operator allowlist', !allowErr, allowErr?.message ?? operator.email);
  cleanup.allowlistAdded.push(operator.email.toLowerCase());

  const opSession = await sessionFromOtp(operator.email);
  const res = await apiFetch('/admin/settings', opSession.cookieHeader);
  record('T1b', 'operator /admin/settings loads', res.status === 200, String(res.status));

  if (res.status !== 200) return;

  const html = await res.text();
  const { ratio, runs, sumTarget } = await computeBlockedRatio7d();
  const expectedTier = tierForRatio(runs >= 3 && sumTarget > 0 ? ratio : null);
  const expectedLabel = TIER_LABELS[expectedTier];

  record(
    'T1c',
    'settings HTML shows 成本档位 label',
    html.includes('成本档位'),
    'proxyCostTierLabel zh',
  );
  record(
    'T1d',
    'settings HTML shows 7 日封禁率 row',
    html.includes('7 日封禁率'),
    'blocked ratio label',
  );
  record(
    'T1e',
    'settings HTML shows expected tier chip label',
    html.includes(expectedLabel),
    `expected=${expectedLabel} tier=${expectedTier} runs=${runs} ratio=${ratio != null ? (ratio * 100).toFixed(1) + '%' : 'n/a'}`,
  );
  record(
    'T1f',
    'settings HTML shows tier hint text',
    html.includes('7 日封禁率') &&
      (html.includes('监控') ||
        html.includes('Webshare') ||
        html.includes('住宅') ||
        html.includes('数据不足')),
    'hint paragraph present',
  );
}

async function main() {
  console.log(`=== Phase 16 UAT (${BASE}) ===\n`);

  if (!url || !anonKey || !serviceKey) {
    console.error('Missing Supabase env');
    process.exit(1);
  }

  await testUnitAndStatic();
  await testAdminSettingsUi();

  const passed = results.filter((r) => r.pass).length;
  const blocked = results.filter((r) => r.blocked).length;
  const failed = results.filter((r) => !r.pass && !r.blocked).length;

  writeFileSync(OUT, `${JSON.stringify({ passed, failed, blocked, results }, null, 2)}\n`);

  console.log(`\n=== ${passed}/${results.length} passed, ${failed} failed, ${blocked} blocked ===\n`);

  await cleanupAll();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await cleanupAll();
  process.exit(2);
});
