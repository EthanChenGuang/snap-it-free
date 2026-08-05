/** Parse region, city, and category slug from a Subito regalo category listing URL. */
export function parseRegaloCategoryUrl(url: string): {
  region: string;
  city: string;
  categorySlug: string;
} | null {
  try {
    const { pathname } = new URL(url);
    const m = pathname.match(/^\/annunci-([^/]+)\/regalo\/([^/]+)\/([^/]+)\/\3\/?$/i);
    if (!m) return null;
    return {
      region: m[1].toLowerCase(),
      categorySlug: m[2],
      city: m[3].toLowerCase(),
    };
  } catch {
    return null;
  }
}
