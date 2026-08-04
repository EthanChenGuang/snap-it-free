/** Extract human-readable category from Subito regalo URL segment (assumption A7). */
export function extractCategoryFromSubitoUrl(externalUrl: string): string | null {
  try {
    const { pathname } = new URL(externalUrl);
    const match = pathname.match(/\/regalo\/([^/]+)/i);
    if (!match?.[1]) {
      return null;
    }
    return match[1].replace(/-/g, ' ');
  } catch {
    return null;
  }
}
