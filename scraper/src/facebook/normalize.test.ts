import { describe, expect, it } from 'vitest';
import { facebookExternalUrl, normalizeFacebookRawListing } from './normalize.js';

describe('facebookExternalUrl (D-18-35)', () => {
  it('returns canonical marketplace item URL', () => {
    expect(facebookExternalUrl('9876543210123456')).toBe(
      'https://www.facebook.com/marketplace/item/9876543210123456/',
    );
  });
});

describe('normalizeFacebookRawListing (tracer)', () => {
  const base = {
    external_id: '9876543210123456',
    title: 'Sedia ufficio gratis Venezia',
    photo_url: 'https://scontent.xx.fbcdn.net/v/t39.30808-6/sample-chair.jpg',
    external_url: 'https://www.facebook.com/marketplace/item/9876543210123456/',
    lat: null,
    lng: null,
    posted_at: '2026-08-15T10:00:00.000Z',
    source: 'facebook' as const,
    price: '0',
    price_formatted: 'Gratis',
  };

  it('accepts free price and sets source=facebook', () => {
    const result = normalizeFacebookRawListing(base);
    expect('reject' in result).toBe(false);
    if ('reject' in result) return;
    expect(result.source).toBe('facebook');
    expect(result.external_url).toBe(facebookExternalUrl(base.external_id));
    expect(result.category).toBeNull();
  });

  it('rejects non-free price', () => {
    const result = normalizeFacebookRawListing({ ...base, price: '15', price_formatted: '15 €' });
    expect(result).toEqual({ reject: 'not_free' });
  });

  it('rejects missing price as price_ambiguous', () => {
    const result = normalizeFacebookRawListing({
      ...base,
      price: undefined,
      price_formatted: undefined,
    });
    expect(result).toEqual({ reject: 'price_ambiguous' });
  });
});
