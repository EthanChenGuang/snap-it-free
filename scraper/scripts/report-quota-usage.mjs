#!/usr/bin/env node
/**
 * Log Supabase Free-tier quota snapshot as JSON (DB table sizes + ugc-photos storage).
 *
 * Usage:
 *   node --import tsx scraper/scripts/report-quota-usage.mjs
 *   node --import tsx scraper/scripts/report-quota-usage.mjs --pretty
 *
 * Requires migration 026_quota_usage_snapshot.sql applied.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (scraper/.env or env).
 *
 * Suggested cron (daily 08:00 UTC on Fly worker host or local):
 *   0 8 * * * cd /app && node --import tsx scripts/report-quota-usage.mjs >> /var/log/quota-usage.log 2>&1
 */
import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

function classifyLevel(usedBytes, limitBytes) {
  const ratio = limitBytes > 0 ? usedBytes / limitBytes : 0;
  if (ratio >= 0.8) return 'red';
  if (ratio >= 0.5) return 'yellow';
  return 'green';
}

const FREE_DB_BYTES = 500 * 1024 * 1024;
const FREE_STORAGE_BYTES = 1024 * 1024 * 1024;

const pretty = process.argv.includes('--pretty');

const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.rpc('get_quota_usage_snapshot');
if (error) {
  console.error(JSON.stringify({ event: 'quota_usage_error', message: error.message }));
  process.exit(1);
}

const databaseBytes = Number(data.database_bytes ?? 0);
const storageBytes = Number(data.storage?.bytes ?? 0);

const report = {
  event: 'quota_usage_snapshot',
  captured_at: data.captured_at,
  database: {
    bytes: databaseBytes,
    limit_bytes: FREE_DB_BYTES,
    level: classifyLevel(databaseBytes, FREE_DB_BYTES),
    top_tables: (data.tables ?? []).slice(0, 8),
  },
  storage: {
    bucket: data.storage?.bucket ?? 'ugc-photos',
    bytes: storageBytes,
    object_count: Number(data.storage?.object_count ?? 0),
    limit_bytes: FREE_STORAGE_BYTES,
    level: classifyLevel(storageBytes, FREE_STORAGE_BYTES),
  },
  note: 'Egress (5 GB/mo Free) is only in Supabase Dashboard → Project Settings → Usage',
};

if (report.database.level === 'red' || report.storage.level === 'red') {
  report.alert = 'Approaching Supabase Free tier limit — review Admin quota card or upgrade to Pro';
}

console.log(JSON.stringify(report, null, pretty ? 2 : 0));
