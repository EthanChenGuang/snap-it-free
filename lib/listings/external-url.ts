const ALLOWED_HOSTS = new Set([
  'subito.it',
  'www.subito.it',
  'vinted.it',
  'www.vinted.it',
  'wallapop.com',
  'www.wallapop.com',
  'it.wallapop.com',
  'facebook.com',
  'www.facebook.com',
]);

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function openExternalListingUrl(url: string): void {
  if (!isAllowedExternalUrl(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
