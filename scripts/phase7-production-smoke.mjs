#!/usr/bin/env node
/**
 * Phase 7 production smoke helper (D-07-45/50, DEPLOY-01/04).
 *
 * Usage:
 *   E2E_BASE_URL=https://<vercel-prod-url> node scripts/phase7-production-smoke.mjs
 *   node scripts/phase7-production-smoke.mjs --build-only
 *
 * Probes (against E2E_BASE_URL, default http://localhost:3001):
 *   - `/` returns 2xx
 *   - `/api/cron/match-alerts` without Authorization returns 401
 *   - `/api/cron/match-alerts` with `Authorization: Bearer $CRON_SECRET` returns 200
 *     (optional — only runs if CRON_SECRET is set in the environment)
 *
 * `--build-only` skips all HTTP probes and instead runs `npm run build` then checks
 * that `public/sw.js` was emitted (Serwist production wrap, next.config.ts).
 *
 * Never logs secret values — only status codes and boolean pass/fail.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const BUILD_ONLY = process.argv.includes('--build-only');

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

const localEnv = loadEnv(resolve(root, '.env.local'));
const cronSecret = process.env.CRON_SECRET ?? localEnv.CRON_SECRET;

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

function runBuildOnly() {
  console.log(`=== Phase 7 build-only smoke ===\n`);
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit',
  });
  record('npm run build', build.status === 0, `exit code ${build.status}`);

  let swExists = false;
  try {
    readFileSync(resolve(root, 'public/sw.js'));
    swExists = true;
  } catch {
    swExists = false;
  }
  record('public/sw.js emitted (Serwist production wrap)', swExists);
}

async function runHttpProbes() {
  console.log(`=== Phase 7 production smoke against ${BASE} ===\n`);

  try {
    const home = await fetch(`${BASE}/`);
    record('/ returns 2xx', home.ok, String(home.status));
  } catch (e) {
    record('/ reachable', false, e.message);
  }

  try {
    const cron = await fetch(`${BASE}/api/cron/match-alerts`);
    record('cron returns 401 without Bearer', cron.status === 401, String(cron.status));
  } catch (e) {
    record('cron route reachable', false, e.message);
  }

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
    console.log('  (skipping authorized cron probe — CRON_SECRET not set in env)');
  }
}

async function main() {
  if (BUILD_ONLY) {
    runBuildOnly();
  } else {
    await runHttpProbes();
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== ${results.length - failed}/${results.length} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
