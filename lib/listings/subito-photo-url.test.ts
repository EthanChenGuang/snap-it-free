import { describe, expect, it } from 'vitest';
import {
  normalizeSubitoFeedPhotoUrl,
  normalizeSubitoPhotoUrl,
  normalizeSubitoThumbnailUrl,
  SUBITO_LISTING_FEED_RULE,
  SUBITO_LISTING_IMAGE_RULE,
  SUBITO_LISTING_THUMBNAIL_RULE,
} from './subito-photo-url';

describe('Subito display presets', () => {
  it('only uses watermark-free `*-new-*` card presets', () => {
    for (const rule of [
      SUBITO_LISTING_IMAGE_RULE,
      SUBITO_LISTING_THUMBNAIL_RULE,
      SUBITO_LISTING_FEED_RULE,
    ]) {
      expect(rule).toMatch(/^card-(mobile|desktop)-new-/);
    }
  });
});

describe('normalizeSubitoPhotoUrl', () => {
  it('appends the watermark-free detail rule to bare sbito CDN URLs', () => {
    expect(
      normalizeSubitoPhotoUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710',
      ),
    ).toBe(
      `https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710?rule=${SUBITO_LISTING_IMAGE_RULE}`,
    );
  });

  it('rewrites stored watermarked gallery URLs to the watermark-free rule', () => {
    expect(
      normalizeSubitoPhotoUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=gallery-mobile-1x-auto',
      ),
    ).toBe(
      `https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=${SUBITO_LISTING_IMAGE_RULE}`,
    );
  });

  it('does not modify non-Subito URLs', () => {
    const url = 'https://wnerhajyjjmrtsdmdpzu.supabase.co/storage/v1/object/public/ugc-photos/x.jpg';
    expect(normalizeSubitoPhotoUrl(url)).toBe(url);
  });
});

describe('normalizeSubitoThumbnailUrl', () => {
  it('appends the card-mobile thumbnail rule to bare sbito CDN URLs', () => {
    expect(
      normalizeSubitoThumbnailUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710',
      ),
    ).toBe(
      `https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710?rule=${SUBITO_LISTING_THUMBNAIL_RULE}`,
    );
  });

  it('replaces an existing gallery rule with the thumbnail rule', () => {
    expect(
      normalizeSubitoThumbnailUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=gallery-mobile-1x-auto',
      ),
    ).toBe(
      `https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=${SUBITO_LISTING_THUMBNAIL_RULE}`,
    );
  });

  it('does not modify non-Subito URLs', () => {
    const url = 'https://wnerhajyjjmrtsdmdpzu.supabase.co/storage/v1/object/public/ugc-photos/x.jpg';
    expect(normalizeSubitoThumbnailUrl(url)).toBe(url);
  });
});

describe('normalizeSubitoFeedPhotoUrl', () => {
  it('uses the sharper watermark-free 400px square preset, not the tiny thumbnail', () => {
    expect(SUBITO_LISTING_FEED_RULE).toBe('card-desktop-new-small-4x-auto');
    expect(SUBITO_LISTING_IMAGE_RULE).toBe('card-mobile-new-large-4x-auto');
    expect(SUBITO_LISTING_FEED_RULE).not.toBe(SUBITO_LISTING_THUMBNAIL_RULE);
  });

  it('appends the feed card rule to bare sbito CDN URLs', () => {
    expect(
      normalizeSubitoFeedPhotoUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710',
      ),
    ).toBe(
      `https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710?rule=${SUBITO_LISTING_FEED_RULE}`,
    );
  });

  it('replaces an existing gallery rule with the feed card rule', () => {
    expect(
      normalizeSubitoFeedPhotoUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=gallery-mobile-1x-auto',
      ),
    ).toBe(
      `https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=${SUBITO_LISTING_FEED_RULE}`,
    );
  });
});
