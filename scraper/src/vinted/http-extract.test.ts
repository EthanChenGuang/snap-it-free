import { describe, expect, it } from 'vitest';
import {
  CategoryParseError,
  loadFixtureCatalog,
  mapCatalogItem,
  parseCatalogApiResponse,
} from './http-extract.js';

const SOURCE_URL = 'https://www.vinted.it/catalog/1918-casa?order=newest_first';

describe('parseCatalogApiResponse (SCRP-E01 tracer)', () => {
  it('extracts typed listings from the Wave 0 catalog fixture without Playwright/network', () => {
    const raw = loadFixtureCatalog();
    const { listings, jsonFieldCompleteness } = parseCatalogApiResponse(raw, SOURCE_URL);

    expect(listings.length).toBe(3);
    expect(jsonFieldCompleteness).toBe(1); // id, title, url, photo, price all present

    const first = listings[0];
    expect(first.source).toBe('vinted');
    expect(first.external_id).toBe('9667196325');
    expect(first.title).toBe('Housse de couette basketball 220×240 cm');
    expect(first.price).toBe('10.0');
    expect(first.photo_url).toContain('images1.vinted.net');
    expect(first.external_url).toContain('9667196325');
    expect(first.source_category_url).toBe(SOURCE_URL);
  });

  it('sets source=vinted on every mapped listing', () => {
    const raw = loadFixtureCatalog();
    const { listings } = parseCatalogApiResponse(raw, SOURCE_URL);
    expect(listings.every((l) => l.source === 'vinted')).toBe(true);
  });

  it('preserves fixture array order', () => {
    const raw = loadFixtureCatalog();
    const { listings } = parseCatalogApiResponse(raw, SOURCE_URL);
    expect(listings.map((l) => l.external_id)).toEqual([
      '9667196325',
      '9667438470',
      '9667438524',
    ]);
  });

  it('throws CategoryParseError when items array is missing/empty', () => {
    expect(() => parseCatalogApiResponse('{}', SOURCE_URL)).toThrow(CategoryParseError);
    expect(() => parseCatalogApiResponse('{"items":[]}', SOURCE_URL)).toThrow(
      CategoryParseError,
    );
    try {
      parseCatalogApiResponse('{"items":[]}', SOURCE_URL);
    } catch (err) {
      expect(err).toBeInstanceOf(CategoryParseError);
      expect((err as CategoryParseError).reason).toBe('empty_listings');
    }
  });

  it('throws CategoryParseError on malformed JSON', () => {
    expect(() => parseCatalogApiResponse('not-json{', SOURCE_URL)).toThrow(CategoryParseError);
  });
});

describe('mapCatalogItem', () => {
  it('maps path-fallback external url', () => {
    const mapped = mapCatalogItem(
      { id: 5, title: 'x', price: { amount: '0' }, path: '/items/5-x', photo: { url: 'u' } },
      SOURCE_URL,
    );
    expect(mapped?.external_url).toBe('https://www.vinted.it/items/5-x');
  });

  it('returns null when required fields are missing', () => {
    expect(mapCatalogItem({}, SOURCE_URL)).toBeNull();
  });
});
