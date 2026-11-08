/**
 * Subito CDN requires a resize rule; bare cdnBaseUrl returns HTTP 400.
 *
 * Watermark policy: only `*-new-*` card presets are center-cropped WITHOUT the Subito
 * watermark. Full-frame presets (`gallery-*`, `fullscreen-*`, `card-mobile-large-*`)
 * burn the Subito logo into the bottom-right corner — never use them for display.
 */

/** Detail hero / default preset — 800×800 watermark-free square (~30–60 KB JPEG). */
export const SUBITO_LISTING_IMAGE_RULE = 'card-desktop-new-small-4x-auto';

/** ~216×164 JPEG (~5.7 KB) — Subito search-card preset; good for 2-col feed thumbs. */
export const SUBITO_LISTING_THUMBNAIL_RULE = 'card-mobile-new-small-2x-auto';

/**
 * Home feed grid preset — 400×400 center crop (~18 KB JPEG), watermark-free like the
 * other `*-new-*` card presets. The 4:5 feed card is ~560×700 device px on a 3x phone;
 * the 216×164 thumbnail preset was upscaled ~4x there and looked blurry/cheap, while
 * full-frame presets (`gallery-*`, `card-mobile-large-*`) carry the Subito watermark.
 */
export const SUBITO_LISTING_FEED_RULE = 'card-desktop-new-small-2x-auto';

export type SubitoPhotoRule =
  | typeof SUBITO_LISTING_IMAGE_RULE
  | typeof SUBITO_LISTING_THUMBNAIL_RULE
  | typeof SUBITO_LISTING_FEED_RULE;

function withSubitoRule(url: string, rule: SubitoPhotoRule): string {
  if (!url.includes('sbito.it')) {
    return url;
  }

  if (url.includes('rule=')) {
    return url.replace(/([?&])rule=[^&]*/, `$1rule=${rule}`);
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}rule=${rule}`;
}

export function normalizeSubitoPhotoUrl(url: string): string {
  return withSubitoRule(url, SUBITO_LISTING_IMAGE_RULE);
}

/** Smaller Subito preset for list/feed cards; swaps an existing `rule=` when present. */
export function normalizeSubitoThumbnailUrl(url: string): string {
  return withSubitoRule(url, SUBITO_LISTING_THUMBNAIL_RULE);
}

/** Sharper Subito preset for the premium home feed grid. */
export function normalizeSubitoFeedPhotoUrl(url: string): string {
  return withSubitoRule(url, SUBITO_LISTING_FEED_RULE);
}
