import { CriticalError } from '@crawlee/core';

const FATAL_PROXY_PATTERNS = [
  /traffic limit/i,
  /quota (exceeded|reached|limit)/i,
  /bandwidth limit/i,
  /payment required/i,
  /402/i,
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
export class ProxyQuotaFatalError extends CriticalError {
  readonly fatalReason: string;

  constructor(fatalReason: string) {
    super(fatalReason);
    this.name = 'ProxyQuotaFatalError';
    this.fatalReason = fatalReason;
  }
}

/** Walk error/cause chain — Crawlee may rethrow the same instance, but duck-type for safety. */
export function findProxyQuotaFatalError(error: unknown): ProxyQuotaFatalError | null {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);

    if (current instanceof ProxyQuotaFatalError) {
      return current;
    }

    if (
      current instanceof Error &&
      current.name === 'ProxyQuotaFatalError' &&
      'fatalReason' in current &&
      typeof (current as ProxyQuotaFatalError).fatalReason === 'string'
    ) {
      return current as ProxyQuotaFatalError;
    }

    current = current instanceof Error ? current.cause : undefined;
  }

  return null;
}

export function isProxyQuotaFatalError(error: unknown): error is ProxyQuotaFatalError {
  return findProxyQuotaFatalError(error) !== null;
}
