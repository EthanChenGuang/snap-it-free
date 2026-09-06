import { NextResponse } from 'next/server';

/** PostgREST JWT verify failures (often ES256/HS256 signing mismatch). */
export function isRestJwtError(message: string | undefined, code?: string): boolean {
  if (code === 'PGRST303' || code === 'PGRST301') return true;
  if (!message) return false;
  return (
    message.includes('JWT issued at future') ||
    message.includes('JWSError') ||
    message.includes('No suitable key')
  );
}

type RestErrorInput = { message?: string; code?: string };

export function restErrorResponse(
  error: RestErrorInput,
  options: { fallbackStatus?: number; httpStatus?: number } = {},
): NextResponse {
  const message = error.message ?? '';
  const { fallbackStatus = 500, httpStatus } = options;

  // Head count queries often return message="" with HTTP 401 when JWT verify fails.
  if (httpStatus === 401 || isRestJwtError(message, error.code)) {
    return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
  }

  return NextResponse.json({ error: message || 'Unknown error' }, { status: fallbackStatus });
}
