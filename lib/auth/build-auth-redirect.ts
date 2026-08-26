import { safeNextPath } from './safe-next-path';

/** Build same-origin redirectTo from pathname + raw search string (D-19-02). */
export function buildAuthRedirectPath(pathname: string, searchParamsString: string): string {
  const isSafeInput = pathname.startsWith('/') && !pathname.startsWith('//');
  const safePath = safeNextPath(pathname);
  if (!isSafeInput) return safePath;

  const query = searchParamsString.replace(/^\?/, '').trim();
  if (!query) return safePath;
  const base = safePath.split('?')[0] ?? safePath;
  return `${base}?${query}`;
}
