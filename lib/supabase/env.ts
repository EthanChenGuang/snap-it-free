const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

function readPublicEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/** Validates Supabase public env vars; returns null when unset (build/dev without DB). */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  // Static property access so Next.js can inline NEXT_PUBLIC_* into the client bundle.
  const url = readPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = readPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
