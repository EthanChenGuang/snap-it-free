/** Subito CDN requires a resize rule; bare cdnBaseUrl returns HTTP 400. */
export const SUBITO_LISTING_IMAGE_RULE = 'gallery-mobile-1x-auto';

export function normalizeSubitoPhotoUrl(url: string): string {
  if (!url.includes('sbito.it') || url.includes('rule=')) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}rule=${SUBITO_LISTING_IMAGE_RULE}`;
}
