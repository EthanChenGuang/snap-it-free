import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const supabaseAdmin: SupabaseClient = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const SCRAPE_MIN_SELECTOR_RATE = 0.9;
export const SCRAPE_MIN_COUNT_RATIO = 0.5;
export const TRAILING_RUN_WINDOW = 7;

export const CRON_ENABLED = process.env.CRON_ENABLED === 'true';

export function getProxyUrl(): string | undefined {
  const url = process.env.PROXY_URL?.trim();
  if (!url) {
    return undefined;
  }
  if (!/^https?:\/\//.test(url)) {
    throw new Error('PROXY_URL must be an http(s) URL');
  }
  return url;
}
