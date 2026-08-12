#!/usr/bin/env node
/**
 * Phase 16 — aggregate Subito blocked_url_count for decision gate math.
 *
 * Canonical formula (shared with 16-DECISION-GATE.md and getSubitoBlockedRatio7d):
 *   blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count)
 *   target_url_count per run = COALESCE(array_length(target_urls_snapshot, 1), 0)
 *
 * Usage:
 *   cd scraper && node --import tsx scripts/aggregate-block-rate.mjs
 *   node --import tsx scraper/scripts/aggregate-block-rate.mjs --days 7 --source subito
 *   node --import tsx scraper/scripts/aggregate-block-rate.mjs --json-out /tmp/block-rate.json
 *
 * Flags:
 *   --days N       Lookback window (default: 7)
 *   --source NAME  scrape_runs.source filter (default: subito)
 *   --json-out P   Also write JSON summary to path
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (scraper/.env or env).
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  const opts = {
    days: 7,
    source: 'subito',
    jsonOut: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--days') {
      opts.days = Number.parseInt(argv[++i], 10);
    } else if (arg === '--source') {
      opts.source = argv[++i] ?? 'subito';
    } else if (arg === '--json-out') {
      opts.jsonOut = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node --import tsx scraper/scripts/aggregate-block-rate.mjs [options]

Options:
  --days N        Lookback days (default: 7)
  --source NAME   Source filter (default: subito)
  --json-out P    Write JSON summary to path
  --help          Show this help
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

function targetUrlCount(row) {
  if (Array.isArray(row.target_urls_snapshot) && row.target_urls_snapshot.length > 0) {
    return row.target_urls_snapshot.length;
  }
  return 0;
}

function perRunRatio(row) {
  const target = targetUrlCount(row);
  if (target <= 0) return null;
  return (row.blocked_url_count ?? 0) / target;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function gateRecommendation(blockedRatio7d) {
  if (blockedRatio7d == null) return 'INSUFFICIENT_DATA';
  if (blockedRatio7d < 0.5) return 'STAY_DIRECT';
  return 'NEED_RESIDENTIAL';
}

async function main() {
  const opts = parseArgs(process.argv);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(2);
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - opts.days);
  const sinceIso = since.toISOString();

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('scrape_runs')
    .select('id, started_at, source, blocked_url_count, target_urls_snapshot, degraded, status')
    .eq('source', opts.source)
    .gte('started_at', sinceIso)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('scrape_runs query failed:', error.message);
    process.exit(2);
  }

  const runs = data ?? [];
  let sumBlocked = 0;
  let sumTarget = 0;
  const perRunRatios = [];

  for (const row of runs) {
    const target = targetUrlCount(row);
    const blocked = row.blocked_url_count ?? 0;
    sumBlocked += blocked;
    sumTarget += target;
    const ratio = perRunRatio(row);
    if (ratio != null) {
      perRunRatios.push(ratio);
    }
  }

  const blockedRatio7d = sumTarget > 0 ? sumBlocked / sumTarget : null;
  const meanPerRun =
    perRunRatios.length > 0
      ? perRunRatios.reduce((s, r) => s + r, 0) / perRunRatios.length
      : null;
  const medianPerRun = median(perRunRatios);
  const recommendation = gateRecommendation(blockedRatio7d);

  const summary = {
    source: opts.source,
    windowDays: opts.days,
    since: sinceIso,
    runCount: runs.length,
    runsWithTargetUrls: perRunRatios.length,
    sumBlockedUrlCount: sumBlocked,
    sumTargetUrlCount: sumTarget,
    blockedRatio7d,
    meanPerRunBlockedRatio: meanPerRun,
    medianPerRunBlockedRatio: medianPerRun,
    gateThreshold: 0.5,
    recommendation,
    degradedRunCount: runs.filter((r) => r.degraded).length,
    generatedAt: new Date().toISOString(),
  };

  const pct =
    blockedRatio7d != null ? `${(blockedRatio7d * 100).toFixed(1)}%` : 'n/a';
  const meanPct =
    meanPerRun != null ? `${(meanPerRun * 100).toFixed(1)}%` : 'n/a';
  const medianPct =
    medianPerRun != null ? `${(medianPerRun * 100).toFixed(1)}%` : 'n/a';

  const mdSnippet = `## Block rate summary (${opts.source}, last ${opts.days} days)

- **Runs:** ${runs.length} (${perRunRatios.length} with target URL counts)
- **blocked_ratio_7d:** ${pct} (${sumBlocked}/${sumTarget} URLs)
- **Mean per-run ratio:** ${meanPct}
- **Median per-run ratio:** ${medianPct}
- **Gate (50%):** ${recommendation}
- **Degraded runs:** ${summary.degradedRunCount}
`;

  console.log(JSON.stringify(summary, null, 2));
  console.log('\n--- markdown snippet ---\n');
  console.log(mdSnippet);

  if (opts.jsonOut) {
    mkdirSync(dirname(opts.jsonOut), { recursive: true });
    writeFileSync(opts.jsonOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');
    console.log(`Wrote ${opts.jsonOut}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
