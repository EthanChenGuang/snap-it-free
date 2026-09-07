const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;
const SAFE_METHODS = new Set(['GET', 'HEAD']);
const RETRYABLE_GATEWAY_STATUS = new Set([502, 503, 504, 522]);

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SupabaseRetryOptions = {
  attempts?: number;
  delayMs?: number;
  fetchImpl?: FetchLike;
  onRetry?: (reason: string, attempt: number) => void;
};

/**
 * Wrap fetch so every query, RPC, and storage call made through the client is covered.
 *
 * PGRST303 ("JWT issued at future") is PostgREST rejecting a freshly-minted JWT because its
 * cached clock lags (PostgREST#5196). It is rejected during auth, so retrying is always safe.
 * Gateway 5xx is retried only for GET/HEAD, since a write may already have landed.
 */
export function createSupabaseRetryFetch(options: SupabaseRetryOptions = {}): FetchLike {
  const {
    attempts = RETRY_ATTEMPTS,
    delayMs = RETRY_DELAY_MS,
    fetchImpl = fetch,
    onRetry = (reason, attempt) =>
      console.warn(`[supabase] ${reason} (attempt ${attempt}/${attempts}) — retrying in ${delayMs}ms`),
  } = options;

  return async function retryingFetch(input, init) {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    for (let attempt = 1; ; attempt++) {
      const response = await fetchImpl(input, init);

      if (response.ok || attempt >= attempts) {
        return response;
      }

      const reason = await classifyRetryable(response, method);
      if (!reason) {
        return response;
      }

      onRetry(`${reason} on ${method}`, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  };
}

async function classifyRetryable(response: Response, method: string): Promise<string | null> {
  if (response.status === 401) {
    const body = await response.clone().text();
    return body.includes('PGRST303') ? 'PGRST303' : null;
  }

  if (RETRYABLE_GATEWAY_STATUS.has(response.status) && SAFE_METHODS.has(method)) {
    return `HTTP ${response.status}`;
  }

  return null;
}
