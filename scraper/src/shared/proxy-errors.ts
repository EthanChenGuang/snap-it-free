const FATAL_PROXY_PATTERNS = [
  /traffic limit/i,
  /quota (exceeded|reached|limit)/i,
  /bandwidth limit/i,
  /subscription (expired|inactive)/i,
  /account (suspended|disabled|expired)/i,
] as const;

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Detect proxy failures that will not recover with session rotation or retries.
 * Returns a short operator-facing reason when the crawl should abort immediately.
 */
export function getProxyFatalFailure(error: unknown): string | null {
  const text = errorText(error);

  if (!/407|proxy authentication required|access denied/i.test(text)) {
    for (const pattern of FATAL_PROXY_PATTERNS) {
      if (pattern.test(text)) {
        return 'Proxy quota or account limit reached — check provider dashboard or top up traffic';
      }
    }
    return null;
  }

  for (const pattern of FATAL_PROXY_PATTERNS) {
    if (pattern.test(text)) {
      return 'Proxy quota or account limit reached — check provider dashboard or top up traffic';
    }
  }

  if (/access denied/i.test(text)) {
    return 'Proxy access denied (407) — verify credentials and account status';
  }

  return null;
}

/** Fatal proxy quota/account exhaustion — worker may retry once without proxy (PROXY-C04). */
export class ProxyQuotaFatalError extends Error {
  readonly fatalReason: string;

  constructor(fatalReason: string) {
    super(fatalReason);
    this.name = 'ProxyQuotaFatalError';
    this.fatalReason = fatalReason;
  }
}

export function isProxyQuotaFatalError(error: unknown): error is ProxyQuotaFatalError {
  return error instanceof ProxyQuotaFatalError;
}
