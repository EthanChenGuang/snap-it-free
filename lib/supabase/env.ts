const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** Validates Supabase public env vars; returns null when unset (build/dev without DB). */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = readEnv(URL_KEY);
  const anonKey = readEnv(ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    throw new Error(`${URL_KEY} must be a valid URL`);
  }

  return { url, anonKey };
}

/** Throws when env is required but missing — use at client creation time. */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(`Missing ${URL_KEY} or ${ANON_KEY}`);
  }
  return env;
}
