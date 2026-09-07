import { isTransientRestError } from './rest-error';

type RestResult = { error?: { message?: string; code?: string } | null };

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 300;

/**
 * Re-run a PostgREST call while it fails with PGRST303. See isTransientRestError — the
 * validator's clock only has to catch up, so a short fixed delay is enough.
 *
 * Pass a builder factory rather than a promise, since each attempt needs a fresh request:
 *
 *   const { data, error } = await withRestRetry(() =>
 *     supabase.from('user_favorites').select('listing_id').eq('user_id', user.id),
 *   );
 */
export async function withRestRetry<T extends RestResult>(
  run: () => PromiseLike<T>,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const { attempts = DEFAULT_ATTEMPTS, delayMs = DEFAULT_DELAY_MS } = options;

  let result = await run();

  for (let attempt = 1; attempt < attempts; attempt++) {
    if (!result.error || !isTransientRestError(result.error.message, result.error.code)) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await run();
  }

  return result;
}
