/** D-90: block open redirects via next param; default to /post. */
export function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/post';
  return raw;
}
