/** Canonical Veneto regalo path regex — must stay in sync with lib/admin/subito-regalo-catalog.ts (D-03). */
export const REGALO_CATEGORY_URL_REGEX =
  /^\/annunci-veneto\/regalo\/[^/]+\/(venezia|padova)\/(venezia|padova)\/?$/i;

/** Parse region, city, and category slug from a Subito regalo category listing URL. */
export function parseRegaloCategoryUrl(url: string): {
  region: string;
  city: string;
  categorySlug: string;
} | null {
  try {
    const { pathname } = new URL(url);
    if (!REGALO_CATEGORY_URL_REGEX.test(pathname)) return null;
    const parts = pathname.split('/').filter(Boolean);
    const region = parts[0]?.replace(/^annunci-/i, '').toLowerCase() ?? '';
    const categorySlug = parts[2] ?? '';
    const city = (parts[3] ?? '').toLowerCase();
    return { region, city, categorySlug };
  } catch {
    return null;
  }
}
