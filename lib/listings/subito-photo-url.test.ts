import { describe, expect, it } from 'vitest';
import { normalizeSubitoPhotoUrl } from './subito-photo-url';

describe('normalizeSubitoPhotoUrl', () => {
  it('appends gallery rule to bare sbito CDN URLs', () => {
    expect(
      normalizeSubitoPhotoUrl(
        'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710',
      ),
    ).toBe(
      'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710?rule=gallery-mobile-1x-auto',
    );
  });

  it('leaves URLs that already include a rule unchanged', () => {
    const url =
      'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/30/304a2345-7ef5-4c3b-85f8-0b0be0eed96e?rule=gallery-mobile-1x-auto';
    expect(normalizeSubitoPhotoUrl(url)).toBe(url);
  });

  it('does not modify non-Subito URLs', () => {
    const url = 'https://wnerhajyjjmrtsdmdpzu.supabase.co/storage/v1/object/public/ugc-photos/x.jpg';
    expect(normalizeSubitoPhotoUrl(url)).toBe(url);
  });
});
