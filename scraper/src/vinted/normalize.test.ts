import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { RawListing } from '../subito/extract.js';
import { normalizeVintedRawListing } from './normalize.js';

const VENICE_LAT = 45.44;
const VENICE_LNG = 12.33;

function freeVintedRaw(overrides: Partial<RawListing> = {}): RawListing {
  return {
    source: 'vinted',
    external_id: '9667000001',
    title: 'Scaffale gratuito',
    photo_url: 'https://images1.vinted.net/t/01_02382_x/f800/1.jpeg?s=a',
    external_url: 'https://www.vinted.it/items/9667000001-scaffale-gratuito',
    lat: VENICE_LAT,
    lng: VENICE_LNG,
    posted_at: new Date().toISOString(),
    price: '0',
    image_urls: ['https://images1.vinted.net/t/01_02382_x/f800/1.jpeg?s=a'],
    source_category_url: 'https://www.vinted.it/catalog/1918-casa?order=newest_first',
    ...overrides,
  };
}

describe('normalizeVintedRawListing (tracer row-shape gate)', () => {
  it('accepts a €0 Vinted listing with Venice coords and returns a canonical row (D-17-11)', () => {
    const result = normalizeVintedRawListing(freeVintedRaw());

    expect('reject' in result).toBe(false);
    if ('reject' in result) return;
    expect(result.source).toBe('vinted');
    expect(result.external_id).toBe('9667000001');
    expect(result.lat).toBe(VENICE_LAT);
    expect(result.lng).toBe(VENICE_LNG);
    expect(result.content_hash).toHaveLength(64);
    expect(result.expires_at > result.posted_at).toBe(true);
  });

  it('persists canonical category slug from enriched catalog_id at normalize (D-17-16)', () => {
    const result = normalizeVintedRawListing(
      freeVintedRaw({ catalog_id: 1918, title: 'Oggetto generico' }),
    );

    expect('reject' in result).toBe(false);
    if ('reject' in result) return;
    expect(result.category).toBe('arredamento-casalinghi');
  });

  it('rejects a non-free listing with reason not_free (D-17-04)', () => {
    const result = normalizeVintedRawListing(freeVintedRaw({ price: '4.35' }));
    expect(result).toEqual({ reject: 'not_free' });
  });

  it('rejects a listing whose external_url host is not vinted.it (T-17-04)', () => {
    const result = normalizeVintedRawListing(
      freeVintedRaw({ external_url: 'https://evil.example.com/item' }),
    );
    expect(result).toEqual({ reject: 'invalid_external_host' });
  });

  it('throws at schema layer for coordinates outside the Venice bbox (D-17-11)', () => {
    // Rome coords (lat 41.9, lng 12.5) fall outside the Venice bbox; the
    // CanonicalListingSchema superRefine rejects them via a ZodError.
    expect(() =>
      normalizeVintedRawListing(freeVintedRaw({ lat: 41.9, lng: 12.5 })),
    ).toThrow(ZodError);
  });
});
