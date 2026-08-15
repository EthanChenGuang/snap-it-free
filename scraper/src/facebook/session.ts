/**
 * Facebook session probe helpers (D-18-09/12).
 *
 * Wave 0 spike uses Playwright navigation; unit tests classify final URLs without network.
 */

export type SessionProbeResult = 'valid' | 'session_expired';

export function classifySessionProbeUrl(finalUrl: string): SessionProbeResult {
  if (!finalUrl) return 'session_expired';
  if (/\/login\/?(\?|$)/i.test(finalUrl)) return 'session_expired';
  if (/facebook\.com\/login/i.test(finalUrl)) return 'session_expired';
  if (/\/checkpoint\/?(\?|$)/i.test(finalUrl)) return 'session_expired';
  return 'valid';
}

export type SessionCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export type SessionPayload = {
  cookies: SessionCookie[];
};

/** Returns false when c_user auth cookie is absent (D-18-12). */
export function hasAuthCookie(cookies: SessionCookie[]): boolean {
  return cookies.some((c) => c.name === 'c_user' && Boolean(c.value));
}

export function probeSessionFromNavigation(
  finalUrl: string,
  cookies: SessionCookie[],
): SessionProbeResult {
  if (!hasAuthCookie(cookies)) return 'session_expired';
  return classifySessionProbeUrl(finalUrl);
}
