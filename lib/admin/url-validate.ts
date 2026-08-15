import { REGALO_CATEGORY_URL_REGEX } from './subito-regalo-catalog';

const HOST_ALLOWLIST: Record<string, RegExp> = {
  subito: /(^|\.)subito\.it$/i,
  facebook: /(^|\.)facebook\.com$/i,
  vinted: /(^|\.)vinted\.it$/i,
  wallapop: /(^|\.)wallapop\.com$/i,
  ebay: /(^|\.)ebay\.it$/i,
};

/** Vinted admin URLs must target catalog pages (T-17-SSRF). */
const VINTED_CATALOG_PATH_REGEX = /^\/catalog\/\d+/i;

/** Facebook admin URLs must target marketplace search pages only (D-18-24, T-18-SSRF). */
export const FACEBOOK_MARKETPLACE_SEARCH_REGEX = /^\/marketplace\/[a-z0-9-]+\/search\/?$/i;

function hostMatchesSlug(hostname: string, slug: string): boolean {
  const pattern = HOST_ALLOWLIST[slug];
  return pattern != null && pattern.test(hostname);
}

export function validateTargetUrl(
  url: string,
  slug: string,
): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'HTTPS required' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostMatchesSlug(hostname, slug)) {
    return { ok: false, error: `Host not allowed for ${slug}` };
  }

  if (slug === 'subito' && !REGALO_CATEGORY_URL_REGEX.test(parsed.pathname)) {
    return { ok: false, error: 'Subito URLs must match Veneto regalo city template' };
  }

  if (slug === 'vinted' && !VINTED_CATALOG_PATH_REGEX.test(parsed.pathname)) {
    return { ok: false, error: 'Vinted URLs must use /catalog/{id} path' };
  }

  if (slug === 'facebook') {
    if (!FACEBOOK_MARKETPLACE_SEARCH_REGEX.test(parsed.pathname)) {
      return { ok: false, error: 'Facebook URLs must be /marketplace/{city}/search/' };
    }
    const query = parsed.searchParams.get('query')?.trim();
    if (!query) {
      return { ok: false, error: 'Facebook search URLs require query param' };
    }
  }

  return { ok: true };
}

export function validateTargetUrls(
  slug: string,
  urls: string[],
): { ok: true } | { ok: false; error: string } {
  if (urls.length === 0) {
    return { ok: false, error: 'At least one URL is required' };
  }

  for (const url of urls) {
    const result = validateTargetUrl(url, slug);
    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}
