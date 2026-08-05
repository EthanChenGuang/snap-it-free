/** Extract Subito category slug from listing or category URL (D-18). */
export function extractCategoryFromSubitoUrl(externalUrl: string): string | null {
  try {
    const { pathname } = new URL(externalUrl);
    const segments = pathname.split('/').filter(Boolean);
    // Detail: /{category}/{listing-slug}.htm
    if (segments.length >= 2 && segments[1]?.includes('.htm')) {
      return segments[0] ?? null;
    }
    // Category listing fallback: /annunci-veneto/regalo/{cat}/...
    const regaloMatch = pathname.match(/\/regalo\/([^/]+)/i);
    return regaloMatch?.[1] ?? null;
  } catch {
    return null;
  }
}
