/**
 * Subito CDN requires a resize rule; bare cdnBaseUrl returns HTTP 400.
 *
 * Watermark policy: only `*-new-*` card presets are served WITHOUT the Subito watermark.
 * `gallery-*`, `fullscreen-*` and the old `card-mobile-large-*` (no `new`) burn the Subito
 * logo into the bottom-right corner — never use them for display.
 *
 * `card-mobile-new-large-*` presets are watermark-free AND full frame (whole photo, no
 * square crop), verified on real listings 2026-11-08:
 *   - large-4x: height 1000 px, width up to 1600 (~125 KB)
 *   - large-3x: height  750 px, width up to 1275 (~90 KB)
 */

/** Detail hero / default preset — full frame, 1000 px tall, watermark-free (~125 KB JPEG). */
export const SUBITO_LISTING_IMAGE_RULE = 'card-mobile-new-large-4x-auto';

/** ~216×164 JPEG (~5.7 KB) — Subito search-card preset; good for 2-col feed thumbs. */
export const SUBITO_LISTING_THUMBNAIL_RULE = 'card-mobile-new-small-2x-auto';

/**
 * Home feed grid preset — 800×800 center crop (~50 KB JPEG), watermark-free. The 4:5 feed
 * card is ~560×700 device px on a 3x phone, so this renders at native sharpness (the old
 * 400×400 was upscaled ~1.75x). A square crop is deliberate: full-frame landscape photos
 * (`card-mobile-new-large-*`) lose MORE of the item when cropped to a 4:5 card.
 * Owner preference (2026-11-08): large, high-resolution photos look noticeably more premium.
 * Images are hot-linked, so the extra bytes cost us nothing (users download ~2–3x per card).
 */
export const SUBITO_LISTING_FEED_RULE = 'card-desktop-new-small-4x-auto';

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
