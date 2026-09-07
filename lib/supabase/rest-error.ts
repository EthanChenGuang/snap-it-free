import { NextResponse } from 'next/server';

/**
 * PostgREST sporadically rejects a freshly-issued JWT as PGRST303 "JWT issued at future"
 * because its cached clock lags behind the token's `iat` (PostgREST#5196). The identical
 * request succeeds on retry, so this must not be mistaken for an invalid session.
 */
export function isTransientRestError(message: string | undefined, code?: string): boolean {
  if (code === 'PGRST303') return true;
  return message?.includes('JWT issued at future') ?? false;
}

/** PostgREST rejected the token itself — the user has to re-authenticate. */
export function isRestJwtError(message: string | undefined, code?: string): boolean {
  if (code === 'PGRST301') return true;
  if (!message) return false;
  return message.includes('JWSError') || message.includes('No suitable key');
}

type RestErrorInput = { message?: string; code?: string };

export function restErrorResponse(
  error: RestErrorInput,
  options: { fallbackStatus?: number; httpStatus?: number } = {},
): NextResponse {
  const message = error.message ?? '';
  const { fallbackStatus = 500, httpStatus } = options;

  // Checked before the 401 branch: PGRST303 also arrives as HTTP 401.
  if (isTransientRestError(message, error.code)) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  // Head count queries often return message="" with HTTP 401 when JWT verify fails.
  if (httpStatus === 401 || isRestJwtError(message, error.code)) {
    return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
  }

  return NextResponse.json({ error: message || 'Unknown error' }, { status: fallbackStatus });
}
