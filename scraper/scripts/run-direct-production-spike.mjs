#!/usr/bin/env node
/**
 * Phase 16 PROXY-C02 — append daily direct-crawl block-rate snapshot to spike artifact.
 *
 * Spawns aggregate-block-rate.mjs for the 7-day window, parses JSON summary, and
 * appends (or replaces) a dated section in 16-SPIKE-DIRECT-7DAY.md Daily log.
 *
 * Usage:
 *   node --import tsx scraper/scripts/run-direct-production-spike.mjs
 *   node --import tsx scraper/scripts/run-direct-production-spike.mjs --days 7
 *   node --import tsx scraper/scripts/run-direct-production-spike.mjs --dry-run
 *
 * Flags:
 *   --days N     Lookback passed to aggregate-block-rate (default: 7)
 *   --dry-run    Print markdown block without writing artifact
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (scraper/.env).
 * Idempotent: re-running on the same UTC date replaces that date's log section.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const aggregateScript = join(__dirname, 'aggregate-block-rate.mjs');
const spikeArtifact = join(
  repoRoot,
  '.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-SPIKE-DIRECT-7DAY.md',
);
const decisionGate = join(
  repoRoot,
  '.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-DECISION-GATE.md',
);

const LOG_START = '<!-- daily-log-start -->';
const LOG_END = '<!-- daily-log-end -->';

function parseArgs(argv) {
  const opts = { days: 7, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--days') {
      opts.days = Number.parseInt(argv[++i], 10);
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node --import tsx scraper/scripts/run-direct-production-spike.mjs [options]

Options:
  --days N     Lookback days for aggregate-block-rate (default: 7)
  --dry-run    Print section without writing files
  --help       Show this help
`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(opts.days) || opts.days < 1) {
    console.error('--days must be a positive integer');
    process.exit(2);
  }
  return opts;
}

function runAggregate(days) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', aggregateScript, '--days', String(days)],
    {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      env: process.env,
    },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'aggregate-block-rate.mjs failed');
    process.exit(result.status ?? 2);
  }

  const stdout = result.stdout ?? '';
  const jsonStart = stdout.indexOf('{');
  const jsonEnd = stdout.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    console.error('Could not parse JSON from aggregate-block-rate output');
    process.exit(2);
  }

  try {
    return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
  } catch {
    console.error('Invalid JSON from aggregate-block-rate output');
    process.exit(2);
  }
}

function formatPct(ratio) {
  if (ratio == null) return 'n/a';
  return `${(ratio * 100).toFixed(1)}%`;
}

function buildLogSection(summary) {
  const dateKey = (summary.generatedAt ?? new Date().toISOString()).slice(0, 10);
  const header = `### ${dateKey} — direct spike snapshot`;
  const blockedPct = formatPct(summary.blockedRatio7d);
  const meanPct = formatPct(summary.meanPerRunBlockedRatio);
  const medianPct = formatPct(summary.medianPerRunBlockedRatio);

  return `${header}

- **Generated:** ${summary.generatedAt}
- **Window:** last ${summary.windowDays} days (since ${summary.since})
- **Runs:** ${summary.runCount} (${summary.runsWithTargetUrls} with target URLs)
- **blocked_ratio_7d:** ${blockedPct} (${summary.sumBlockedUrlCount}/${summary.sumTargetUrlCount} URLs)
- **Mean per-run ratio:** ${meanPct}
- **Median per-run ratio:** ${medianPct}
- **Degraded runs:** ${summary.degradedRunCount}
- **Gate (50%):** ${summary.recommendation}

`;
}

function upsertDailyLog(content, section, dateKey) {
  const headerPrefix = `### ${dateKey} — direct spike snapshot`;
  const startIdx = content.indexOf(LOG_START);
  const endIdx = content.indexOf(LOG_END);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    console.error('Daily log markers missing in spike artifact');
    process.exit(2);
  }

  const before = content.slice(0, startIdx + LOG_START.length);
  const after = content.slice(endIdx);
  let logBody = content.slice(startIdx + LOG_START.length, endIdx);

  const sectionRegex = new RegExp(
    `### ${dateKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — direct spike snapshot[\\s\\S]*?(?=\\n### \\d{4}-\\d{2}-\\d{2} — direct spike snapshot|$)`,
    'm',
  );

  if (sectionRegex.test(logBody)) {
    logBody = logBody.replace(sectionRegex, section.trimEnd() + '\n\n');
  } else {
    logBody = `${logBody.trimEnd()}\n\n${section}`;
  }

  return `${before}\n\n${logBody.trimEnd()}\n\n${after}`;
}

function updateAggregateTable(content, summary) {
  const dateKey = (summary.generatedAt ?? new Date().toISOString()).slice(0, 10);
  const blockedPct = formatPct(summary.blockedRatio7d);
  const meanPct = formatPct(summary.meanPerRunBlockedRatio);
  const row = `| ${dateKey} | ${summary.runCount} | ${meanPct} | ${summary.degradedRunCount} | Day 0 baseline (auto) |`;

  if (content.includes('| _pending_ |')) {
    return content.replace('| _pending_ | — | — | — | Day 0 baseline — run `run-direct-production-spike.mjs` |', row);
  }

  const tableHeader = '| Date | Runs | Mean blocked_ratio | Degraded runs | Notes |';
  const headerIdx = content.indexOf(tableHeader);
  if (headerIdx < 0) return content;

  const afterHeader = content.indexOf('\n', content.indexOf('|---', headerIdx));
  if (afterHeader < 0) return content;

  const dateRowRegex = new RegExp(
    `\\| ${dateKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|[\\s\\S]*?\\|\\n`,
  );
  if (dateRowRegex.test(content)) {
    return content.replace(dateRowRegex, `${row}\n`);
  }

  return `${content.slice(0, afterHeader + 1)}${row}\n${content.slice(afterHeader + 1)}`;
}

function updateAggregateSummary(content, summary) {
  const blockedPct = formatPct(summary.blockedRatio7d);
  const sufficient = summary.runCount > 0 ? 'partial' : 'no';
  let updated = content
    .replace('| Total runs | _pending_ |', `| Total runs | ${summary.runCount} |`)
    .replace('| blocked_ratio_7d | _pending_ |', `| blocked_ratio_7d | ${blockedPct} |`)
    .replace('| Gate recommendation | _pending_ |', `| Gate recommendation | ${summary.recommendation} |`)
    .replace('| Sample sufficient (≥7 days)? | _pending_ |', `| Sample sufficient (≥7 days)? | ${sufficient} — extend to 7 days |`);
  return updated;
}

function updateDecisionGate(summary) {
  let content = readFileSync(decisionGate, 'utf-8');
  const blockedPct = formatPct(summary.blockedRatio7d);
  const gate =
    summary.recommendation === 'STAY_DIRECT'
      ? 'PASS'
      : summary.recommendation === 'NEED_RESIDENTIAL'
        ? 'FAIL'
        : 'INSUFFICIENT_DATA';

  content = content
    .replace('| Last computed | _pending_ |', `| Last computed | ${summary.generatedAt} |`)
    .replace('| blocked_ratio_7d | _pending_ |', `| blocked_ratio_7d | ${blockedPct} |`)
    .replace('| Gate | _pending_ |', `| Gate | ${gate} |`)
    .replace('| Recommendation | _pending_ |', `| Recommendation | ${summary.recommendation} |`);

  return content;
}

function main() {
  const opts = parseArgs(process.argv);
  const summary = runAggregate(opts.days);
  const section = buildLogSection(summary);
  const dateKey = (summary.generatedAt ?? new Date().toISOString()).slice(0, 10);

  console.log(section);

  if (opts.dryRun) {
    console.log('(dry-run — no files written)');
    process.exit(0);
  }

  let spikeContent = readFileSync(spikeArtifact, 'utf-8');
  spikeContent = upsertDailyLog(spikeContent, section, dateKey);
  spikeContent = updateAggregateTable(spikeContent, summary);
  spikeContent = updateAggregateSummary(spikeContent, summary);
  writeFileSync(spikeArtifact, spikeContent, 'utf-8');
  console.log(`Updated ${spikeArtifact}`);

  const gateContent = updateDecisionGate(summary);
  writeFileSync(decisionGate, gateContent, 'utf-8');
  console.log(`Updated ${decisionGate}`);

  process.exit(0);
}

main();
