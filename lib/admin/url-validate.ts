const HOST_ALLOWLIST: Record<string, RegExp> = {
  subito: /(^|\.)subito\.it$/i,
  facebook: /(^|\.)facebook\.com$/i,
  vinted: /(^|\.)vinted\.it$/i,
  wallapop: /(^|\.)wallapop\.com$/i,
  ebay: /(^|\.)ebay\.it$/i,
};

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

  if (slug === 'subito' && !parsed.pathname.includes('venezia')) {
    return { ok: false, error: 'Subito URLs must be Venice-scoped (venezia path)' };
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
