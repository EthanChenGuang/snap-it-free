/**
 * Backfill translation_usage_log from existing translated listings.
 *
 * Estimates token/cost from listing content for rows missing any usage log entry.
 * Requires migration 027_translation_usage_log.sql applied.
 *
 * Usage:
 *   npx tsx scripts/backfill-translation-usage-log.ts
 *   npx tsx scripts/backfill-translation-usage-log.ts --dry-run
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local or scraper/.env)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  computeTranslationCostUsd,
  estimateListingInputTokens,
} from '../lib/admin/translation-cost';
import { resolveGeminiModel, resolveOpenRouterModel } from '../lib/admin/translation-models';

const OUTPUT_TOKENS = 130;
const BATCH_SIZE = 200;

const dryRun = process.argv.includes('--dry-run');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

function resolveSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    console.error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
  return url.replace(/\/$/, '');
}

function descriptionFromPayload(rawPayload: unknown): string | null {
  if (rawPayload && typeof rawPayload === 'object' && 'description' in rawPayload) {
    const description = (rawPayload as { description?: unknown }).description;
    return typeof description === 'string' ? description : null;
  }
  return null;
}

loadEnvFile(resolve(root, '.env.local'));
loadEnvFile(resolve(root, 'scraper/.env'));

const supabase = createClient(resolveSupabaseUrl(), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: configRow, error: configError } = await supabase
  .from('scraper_global_config')
  .select('translation_provider')
  .eq('id', 1)
  .maybeSingle();

if (configError) {
  console.error(JSON.stringify({ event: 'backfill_error', message: configError.message }));
  process.exit(1);
}

const provider =
  configRow?.translation_provider === 'openrouter' ? ('openrouter' as const) : ('gemini' as const);
const model =
  provider === 'openrouter'
    ? resolveOpenRouterModel(process.env.OPENROUTER_FALLBACK_MODEL)
    : resolveGeminiModel(process.env.GEMINI_MODEL);

const { count: existingBackfillCount, error: backfillCountError } = await supabase
  .from('translation_usage_log')
  .select('*', { count: 'exact', head: true })
  .eq('source', 'backfill');

if (backfillCountError) {
  console.error(
    JSON.stringify({
      event: 'backfill_error',
      message: backfillCountError.message,
      hint: 'Apply supabase/migrations/027_translation_usage_log.sql first',
    }),
  );
  process.exit(1);
}

if ((existingBackfillCount ?? 0) > 0 && !process.argv.includes('--force')) {
  console.log(
    JSON.stringify({
      event: 'backfill_skipped',
      reason: 'backfill rows already exist',
      existing_backfill_rows: existingBackfillCount,
      hint: 'Pass --force to run again (skips listings that already have any log row)',
    }),
  );
  process.exit(0);
}

const { data: loggedListingRows, error: loggedError } = await supabase
  .from('translation_usage_log')
  .select('listing_id')
  .not('listing_id', 'is', null);

if (loggedError) {
  console.error(JSON.stringify({ event: 'backfill_error', message: loggedError.message }));
  process.exit(1);
}

const loggedListingIds = new Set(
  (loggedListingRows ?? [])
    .map((row) => row.listing_id)
    .filter((value): value is string => typeof value === 'string'),
);

type PendingRow = {
  listing_id: string;
  provider: 'gemini' | 'openrouter';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: null;
  source: 'backfill';
  created_at: string;
};

let offset = 0;
let scanned = 0;
let inserted = 0;
let skippedExisting = 0;
const pendingRows: PendingRow[] = [];

while (true) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, category, raw_payload, scraped_at')
    .not('title_en', 'is', null)
    .order('scraped_at', { ascending: true })
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) {
    console.error(JSON.stringify({ event: 'backfill_error', message: error.message }));
    process.exit(1);
  }

  if (!data?.length) {
    break;
  }

  for (const row of data) {
    scanned += 1;
    if (loggedListingIds.has(row.id)) {
      skippedExisting += 1;
      continue;
    }

    const inputTokens = estimateListingInputTokens({
      title: row.title,
      description: descriptionFromPayload(row.raw_payload),
      category: row.category,
    });
    const outputTokens = OUTPUT_TOKENS;
    const costUsd = computeTranslationCostUsd(provider, inputTokens, outputTokens);

    pendingRows.push({
      listing_id: row.id,
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      duration_ms: null,
      source: 'backfill',
      created_at: row.scraped_at,
    });
    loggedListingIds.add(row.id);
  }

  offset += data.length;
  if (data.length < BATCH_SIZE) {
    break;
  }
}

if (!dryRun && pendingRows.length > 0) {
  for (let i = 0; i < pendingRows.length; i += BATCH_SIZE) {
    const chunk = pendingRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('translation_usage_log').insert(chunk);
    if (error) {
      console.error(JSON.stringify({ event: 'backfill_error', message: error.message, at: i }));
      process.exit(1);
    }
    inserted += chunk.length;
  }
} else {
  inserted = pendingRows.length;
}

console.log(
  JSON.stringify(
    {
      event: dryRun ? 'backfill_dry_run' : 'backfill_complete',
      provider,
      model,
      scanned,
      skipped_existing_logs: skippedExisting,
      inserted,
      sample_cost_usd: pendingRows[0]?.cost_usd ?? 0,
    },
    null,
    2,
  ),
);
