#!/usr/bin/env node
/**
 * Phase 16 PROXY-C03 — compare residential providers on the same Subito URL matrix.
 *
 * Spawns spike-subito-proxy-matrix.mjs per provider (direct baseline + Webshare / Decodo / IPRoyal),
 * parses blocked counts and latency, writes 16-SPIKE-PROVIDER-COMPARE.md with cost-aware recommendation.
 *
 * Usage:
 *   node scraper/scripts/run-provider-compare-spike.mjs
 *   node scraper/scripts/run-provider-compare-spike.mjs --dry-run
 *   node scraper/scripts/run-provider-compare-spike.mjs --skip-direct
 *
 * Env (any alias accepted):
 *   WEBSHARE_PROXY_USERNAME / WEBSHARE_USERNAME + WEBSHARE_PROXY_PASSWORD / WEBSHARE_PASSWORD
 *   DECODO_PROXY_USERNAME / DECODO_USERNAME + DECODO_PROXY_PASSWORD / DECODO_PASSWORD
 *   IPROYAL_PROXY_USERNAME / IPROYAL_USERNAME + IPROYAL_PROXY_PASSWORD / IPROYAL_PASSWORD
 *   SCRAPER_PROXY_URL — Decodo fallback when DECODO_* unset
 *
 * Missing provider credentials → SKIP row (does not abort compare).
 * Proxy URLs masked in artifact (host only).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const spikeScript = join(__dirname, 'spike-subito-proxy-matrix.mjs');
const artifactPath = join(
  repoRoot,
  '.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-SPIKE-PROVIDER-COMPARE.md',
);
const decisionGatePath = join(
  repoRoot,
  '.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-DECISION-GATE.md',
);

/** Lowest $/GB first — used for recommendation when pass_rate ≥ 0.5 */
const PROVIDER_COSTS = [
  { provider: 'direct', label: 'direct', costPerGb: 0, host: '[none — direct]' },
  { provider: 'webshare', label: 'webshare', costPerGb: 1.4, host: 'p.webshare.io (masked)' },
  { provider: 'iproyal', label: 'iproyal', costPerGb: 1.75, host: 'geo.iproyal.com (masked)' },
  { provider: 'decodo', label: 'decodo', costPerGb: 2.0, host: 'gate.decodo.com (masked)' },
];

const PASS_RATE_THRESHOLD = 0.5;

function parseArgs(argv) {
  const opts = { dryRun: false, skipDirect: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--skip-direct') {
      opts.skipDirect = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scraper/scripts/run-provider-compare-spike.mjs [options]

Options:
  --dry-run       Print rows without writing artifact
  --skip-direct   Skip direct baseline spike (proxy providers only)
  --help          Show this help
`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

function envFirst(...keys) {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

function buildWebshareUrl() {
  const baseUser = envFirst('WEBSHARE_PROXY_USERNAME', 'WEBSHARE_USERNAME');
  const password = envFirst('WEBSHARE_PROXY_PASSWORD', 'WEBSHARE_PASSWORD');
  if (!baseUser || !password) return null;

  const port = process.env.WEBSHARE_PORT?.trim() || '80';
  const city = process.env.WEBSHARE_CITY?.trim().toLowerCase();
  const userRoot = baseUser.replace(/-it(-.*)?$/, '');
  const parts = [userRoot, 'it'];
  if (city) {
    parts.push(`city_${city.replace(/\s+/g, '_')}`);
  }
  parts.push('rotate');
  const username = parts.join('-');
  return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@p.webshare.io:${port}`;
}

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

function buildDecodoUrl() {
  const rawUser = envFirst('DECODO_PROXY_USERNAME', 'DECODO_USERNAME');
  const password = envFirst('DECODO_PROXY_PASSWORD', 'DECODO_PASSWORD');
  if (rawUser && password) {
    const port = process.env.DECODO_PORT?.trim() || '7000';
    const city = process.env.DECODO_CITY?.trim().toLowerCase().replace(/\s+/g, '_');
    const sessionId = process.env.DECODO_SESSION?.trim();
    const sessionMinutes = process.env.DECODO_SESSION_MINUTES?.trim();
    const baseUser = normalizeDecodoUser(rawUser);
    const parts = ['user', baseUser, 'country-it'];
    if (city) parts.push(`city-${city}`);
    if (sessionId) {
      parts.push(`session-${sessionId}`);
      if (sessionMinutes) parts.push(`sessionduration-${sessionMinutes}`);
    }
    const username = parts.join('-');
    return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@gate.decodo.com:${port}`;
  }
  return process.env.SCRAPER_PROXY_URL?.trim() || null;
}

function buildIproyalUrl() {
  const baseUser = envFirst('IPROYAL_PROXY_USERNAME', 'IPROYAL_USERNAME');
  const password = envFirst('IPROYAL_PROXY_PASSWORD', 'IPROYAL_PASSWORD');
  if (!baseUser || !password) return null;

  const host = process.env.IPROYAL_PROXY_HOST?.trim() || 'geo.iproyal.com';
  const port = process.env.IPROYAL_PORT?.trim() || '12321';
  const country = process.env.IPROYAL_COUNTRY?.trim() || 'it';
  const username = baseUser.includes('_country-') ? baseUser : `${baseUser}_country-${country}`;
  return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
}

function maskProxyUrl(proxyUrl) {
  if (!proxyUrl) return '[none — direct]';
  try {
    const u = new URL(proxyUrl);
    return `${u.hostname}:${u.port || '****'} (credentials masked)`;
  } catch {
    return '[proxy — masked]';
  }
}

function parseSpikeArtifact(md) {
  const totalMatch = md.match(/URLs tested:\s*(\d+)/);
  const blockedMatch = md.match(/Blocked or error:\s*(\d+)\/(\d+)/);
  const total = totalMatch ? Number.parseInt(totalMatch[1], 10) : blockedMatch ? Number.parseInt(blockedMatch[2], 10) : 0;
  const blockedCount = blockedMatch ? Number.parseInt(blockedMatch[1], 10) : 0;

  const wallMsValues = [];
  const rowRegex = /\|\s[^|]+\|\s(\d+)\s\|\s(\d+)\s\|\s/g;
  let m;
  while ((m = rowRegex.exec(md)) !== null) {
    const wallMs = Number.parseInt(m[2], 10);
    if (Number.isFinite(wallMs)) wallMsValues.push(wallMs);
  }
  const meanLatencyMs =
    wallMsValues.length > 0
      ? Math.round(wallMsValues.reduce((a, b) => a + b, 0) / wallMsValues.length)
      : null;

  const passRate = total > 0 ? 1 - blockedCount / total : null;
  const verdictMatch = md.match(/\*\*Overall verdict:\*\*\s*(\S+)/);
  const verdict = verdictMatch?.[1] ?? 'UNKNOWN';

  return { blockedCount, total, meanLatencyMs, passRate, verdict };
}

function runSpike({ direct, proxyUrl, label, outPath }) {
  const args = [spikeScript, '--label', label, '--out', outPath];
  if (direct) {
    args.push('--direct');
  } else if (proxyUrl) {
    args.push('--proxy-url', proxyUrl);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: join(__dirname, '..'),
    encoding: 'utf-8',
    env: process.env,
  });

  let md = '';
  try {
    md = readFileSync(outPath, 'utf-8');
  } catch {
    return {
      status: 'ERROR',
      skipReason: result.stderr?.trim() || 'spike artifact missing',
      blockedCount: null,
      meanLatencyMs: null,
      passRate: null,
      proxyHost: direct ? '[none — direct]' : maskProxyUrl(proxyUrl),
    };
  }

  const parsed = parseSpikeArtifact(md);
  const status =
    parsed.verdict === 'PASS' ? 'PASS' : parsed.blockedCount === parsed.total ? 'FAIL' : 'PARTIAL';

  return {
    status,
    skipReason: null,
    proxyHost: direct ? '[none — direct]' : maskProxyUrl(proxyUrl),
    ...parsed,
  };
}

function readDecisionGateRecommendation() {
  try {
    const content = readFileSync(decisionGatePath, 'utf-8');
    const recMatch = content.match(/\|\s*Recommendation\s*\|\s*(\S+)\s*\|/);
    return recMatch?.[1] ?? 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

function formatPassRate(passRate) {
  if (passRate == null) return 'n/a';
  return `${(passRate * 100).toFixed(0)}%`;
}

function formatRow({ provider, label, result }) {
  if (result.status === 'SKIP') {
    return `| ${provider} | ${label} | — | — | — | ${result.proxyHost} | SKIP — ${result.skipReason} |`;
  }
  if (result.status === 'ERROR') {
    return `| ${provider} | ${label} | — | — | — | ${result.proxyHost} | ERROR — ${result.skipReason} |`;
  }
  return `| ${provider} | ${label} | ${result.blockedCount}/${result.total} | ${result.meanLatencyMs ?? 'n/a'} | ${formatPassRate(result.passRate)} | ${result.proxyHost} | ${result.status} |`;
}

function computeRecommendation(rows, gateRecommendation) {
  const eligible = rows.filter(
    (r) =>
      r.result.status !== 'SKIP' &&
      r.result.status !== 'ERROR' &&
      r.result.passRate != null &&
      r.result.passRate >= PASS_RATE_THRESHOLD &&
      r.provider !== 'direct',
  );

  if (eligible.length === 0) {
    const measuredResidential = rows.some(
      (r) => r.provider !== 'direct' && r.result.status !== 'SKIP' && r.result.status !== 'ERROR',
    );
    if (!measuredResidential) {
      if (gateRecommendation === 'STAY_DIRECT') {
        return '**STAY_DIRECT** — 16-DECISION-GATE PASS; provider compare optional. Re-run with `WEBSHARE_*` / `DECODO_*` when residential needed.';
      }
      return '**INSUFFICIENT** — re-run with Webshare trial credentials (`WEBSHARE_PROXY_USERNAME` / `WEBSHARE_PROXY_PASSWORD`) or Decodo (`DECODO_*` / `SCRAPER_PROXY_URL`).';
    }
    return '**INSUFFICIENT** — no residential provider met pass_rate ≥ 50% on matrix; consider Decodo or extend trial.';
  }

  eligible.sort((a, b) => a.costPerGb - b.costPerGb);
  const best = eligible[0];
  const costLabel = best.costPerGb === 0 ? 'Free' : `$${best.costPerGb.toFixed(2)}/GB`;
  return `**${best.provider.charAt(0).toUpperCase() + best.provider.slice(1)}** — pass_rate ${formatPassRate(best.result.passRate)}, ${costLabel}`;
}

function buildProviderRuns(skipDirect) {
  const runs = [];

  if (!skipDirect) {
    runs.push({
      provider: 'direct',
      label: 'direct',
      costPerGb: 0,
      host: '[none — direct]',
      direct: true,
      proxyUrl: null,
      skipReason: null,
    });
  }

  const webshareUrl = buildWebshareUrl();
  runs.push({
    provider: 'webshare',
    label: 'webshare',
    costPerGb: 1.4,
    host: 'p.webshare.io (masked)',
    direct: false,
    proxyUrl: webshareUrl,
    skipReason: webshareUrl ? null : 'WEBSHARE_PROXY_USERNAME/PASSWORD (or WEBSHARE_USERNAME/PASSWORD) unset',
  });

  const decodoUrl = buildDecodoUrl();
  runs.push({
    provider: 'decodo',
    label: 'decodo',
    costPerGb: 2.0,
    host: 'gate.decodo.com (masked)',
    direct: false,
    proxyUrl: decodoUrl,
    skipReason: decodoUrl ? null : 'DECODO_* and SCRAPER_PROXY_URL unset',
  });

  const iproyalUrl = buildIproyalUrl();
  runs.push({
    provider: 'iproyal',
    label: 'iproyal',
    costPerGb: 1.75,
    host: 'geo.iproyal.com (masked)',
    direct: false,
    proxyUrl: iproyalUrl,
    skipReason: iproyalUrl ? null : 'IPROYAL_PROXY_USERNAME/PASSWORD unset',
  });

  return runs;
}

function updateArtifact(rows, gateRecommendation, generatedAt) {
  let content = readFileSync(artifactPath, 'utf-8');

  content = content.replace('**Date:** _pending_', `**Date:** ${generatedAt}`);
  content = content.replace(
    '**Decision gate:** _pending_ (see `16-DECISION-GATE.md`)',
    `**Decision gate:** ${gateRecommendation} (see \`16-DECISION-GATE.md\`)`,
  );

  const tableHeader = '| provider | label | blocked_count | mean_latency_ms | pass_rate | proxy_host | status |';
  const headerIdx = content.indexOf(tableHeader);
  if (headerIdx < 0) {
    throw new Error('Comparison table header missing in artifact template');
  }
  const separatorIdx = content.indexOf('\n', content.indexOf('|---', headerIdx));
  const notesIdx = content.indexOf('\n## Recommended provider', separatorIdx);
  const tableRows = rows.map((r) => formatRow(r)).join('\n');
  content = `${content.slice(0, separatorIdx + 1)}\n${tableRows}\n${content.slice(notesIdx)}`;

  const recommendation = computeRecommendation(rows, gateRecommendation);
  content = content.replace('## Recommended provider\n\n_pending_', `## Recommended provider\n\n${recommendation}`);

  if (gateRecommendation === 'STAY_DIRECT') {
    const optionalNote =
      '\n\n**Gate note:** Provider compare optional — direct gate PASS. Baseline direct row recorded for reference.';
    if (!content.includes('Provider compare optional — direct gate PASS')) {
      content = content.replace(
        '- Missing credentials produce **SKIP** rows; the script does not fail the entire compare.',
        `- Missing credentials produce **SKIP** rows; the script does not fail the entire compare.${optionalNote}`,
      );
    }
  }

  return content;
}

async function main() {
  const opts = parseArgs(process.argv);
  const gateRecommendation = readDecisionGateRecommendation();
  const generatedAt = new Date().toISOString();
  const tmpDir = mkdtempSync(join(tmpdir(), 'provider-compare-'));
  const runs = buildProviderRuns(opts.skipDirect);
  const rows = [];

  console.log(`=== Provider compare spike (PROXY-C03) ===`);
  console.log(`Decision gate: ${gateRecommendation}`);

  for (const run of runs) {
    if (!run.direct && !run.proxyUrl) {
      console.log(`SKIP ${run.label}: ${run.skipReason}`);
      rows.push({
        provider: run.provider,
        label: run.label,
        costPerGb: run.costPerGb,
        result: {
          status: 'SKIP',
          skipReason: run.skipReason,
          proxyHost: run.host,
        },
      });
      continue;
    }

    const outPath = join(tmpDir, `spike-${run.label}.md`);
    console.log(`Running matrix spike: ${run.label}${run.direct ? ' (direct)' : ''}`);
    const result = runSpike({
      direct: run.direct,
      proxyUrl: run.proxyUrl,
      label: run.label,
      outPath,
    });
    console.log(
      `  ${run.label}: status=${result.status} blocked=${result.blockedCount}/${result.total} pass_rate=${formatPassRate(result.passRate)}`,
    );
    rows.push({
      provider: run.provider,
      label: run.label,
      costPerGb: run.costPerGb,
      result,
    });
  }

  const recommendation = computeRecommendation(rows, gateRecommendation);
  console.log(`\nRecommended: ${recommendation.replace(/\*\*/g, '')}`);

  if (opts.dryRun) {
    console.log('\n(dry-run — artifact not written)');
    process.exit(0);
  }

  const updated = updateArtifact(rows, gateRecommendation, generatedAt);
  writeFileSync(artifactPath, updated, 'utf-8');
  console.log(`\nWrote ${artifactPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
