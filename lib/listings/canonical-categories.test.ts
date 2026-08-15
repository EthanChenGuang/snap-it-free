import { describe, expect, it } from 'vitest';
import {
  INFERRED_CATEGORY_TO_SLUG,
  mapFacebookCategoryToSlug,
  mapPostCategoryToSlug,
  mapVintedCatalogToSlug,
  normalizeCatalogSlug,
  POST_CATEGORY_TO_SLUG,
  resolveCanonicalCategorySlug,
} from './canonical-categories';

describe('normalizeCatalogSlug', () => {
  it('accepts catalog slugs (D-18)', () => {
    expect(normalizeCatalogSlug('informatica')).toBe('informatica');
    expect(normalizeCatalogSlug('arredamento-casalinghi')).toBe('arredamento-casalinghi');
  });

  it('rejects unknown slugs (D-18)', () => {
    expect(normalizeCatalogSlug('not-a-real-slug')).toBeNull();
    expect(normalizeCatalogSlug('')).toBeNull();
    expect(normalizeCatalogSlug(null)).toBeNull();
  });
});

describe('resolveCanonicalCategorySlug', () => {
  it('prefers valid DB slug over title inference (CAT-01)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'subito',
        title: 'Divano in ottime condizioni',
        category: 'informatica',
      }),
    ).toBe('informatica');
  });

  it('falls back to inference when category null (CAT-01)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'ugc',
        title: 'Monitor 24 pollici',
        category: null,
      }),
    ).toBe('informatica');
  });

  it('maps known facebook category ID to Subito slug (D-18-51, CAT-03)', () => {
    expect(mapFacebookCategoryToSlug('847807938447238')).toBe('arredamento-casalinghi');
    expect(
      resolveCanonicalCategorySlug({
        source: 'facebook',
        title: 'Oggetto generico',
        category: null,
        facebookCategoryId: '847807938447238',
      }),
    ).toBe('arredamento-casalinghi');
  });

  it('falls back to title inference for facebook when category ID unmapped (D-18-51)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'facebook',
        title: 'Sedia ikea',
        category: null,
        facebookCategoryId: null,
      }),
    ).toBe('arredamento-casalinghi');
    expect(
      resolveCanonicalCategorySlug({
        source: 'facebook',
        title: 'Monitor 24 pollici',
        category: null,
        facebookCategoryId: 'unknown',
      }),
    ).toBe('informatica');
  });

  it('returns null for unmapped facebook category without inference (D-18-52, D-18-61)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'facebook',
        title: 'Oggetto generico',
        category: null,
        facebookCategoryId: 'unknown',
      }),
    ).toBeNull();
  });

  it('prefers valid DB slug over facebook category map (D-18-51)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'facebook',
        title: 'Sedia ikea',
        category: 'informatica',
        facebookCategoryId: '847807938447238',
      }),
    ).toBe('informatica');
  });

  it('retries inference when DB slug unknown (D-18)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'subito',
        title: 'Monitor 24 pollici',
        category: 'bogus-slug',
      }),
    ).toBe('informatica');
  });

  it('returns null when no resolvable category (CAT-01)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'subito',
        title: 'Oggetto generico',
        category: null,
      }),
    ).toBeNull();
  });

  it('maps Wave 0 verified Vinted catalog ID 1918 to arredamento-casalinghi (CAT-03, D-17-17)', () => {
    expect(mapVintedCatalogToSlug(1918)).toBe('arredamento-casalinghi');
    expect(
      resolveCanonicalCategorySlug({
        source: 'vinted',
        title: 'Oggetto generico',
        category: null,
        vintedCatalogId: 1918,
      }),
    ).toBe('arredamento-casalinghi');
  });

  it('prefers valid DB slug over Vinted catalog map (D-17-17)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'vinted',
        title: 'Divano in ottime condizioni',
        category: 'informatica',
        vintedCatalogId: 1918,
      }),
    ).toBe('informatica');
  });

  it('falls back to title inference for vinted when catalog ID unmapped (D-17-17)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'vinted',
        title: 'Monitor 24 pollici',
        category: null,
        vintedCatalogId: 999999,
      }),
    ).toBe('informatica');
  });

  it('returns null for unmapped Vinted catalog ID without inference — never usato (D-17-18)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'vinted',
        title: 'Oggetto generico',
        category: null,
        vintedCatalogId: 999999,
      }),
    ).toBeNull();
  });

  it('maps multiple Vinted apparel catalog IDs to abbigliamento-accessori (D-17-24)', () => {
    expect(mapVintedCatalogToSlug(1904)).toBe('abbigliamento-accessori');
    expect(mapVintedCatalogToSlug(1906)).toBe('abbigliamento-accessori');
  });
});

describe('mapPostCategoryToSlug', () => {
  it('maps kitchenware to arredamento-casalinghi (D-11)', () => {
    expect(mapPostCategoryToSlug('kitchenware')).toBe('arredamento-casalinghi');
  });

  it('maps others to usato (D-11)', () => {
    expect(mapPostCategoryToSlug('others')).toBe('usato');
  });

  it('maps all six PostCategory values (D-11, CAT-03)', () => {
    expect(mapPostCategoryToSlug('furniture')).toBe('arredamento-casalinghi');
    expect(mapPostCategoryToSlug('tech')).toBe('informatica');
    expect(mapPostCategoryToSlug('books')).toBe('libri-riviste');
    expect(mapPostCategoryToSlug('apparel')).toBe('abbigliamento-accessori');
  });
});

describe('POST_CATEGORY_TO_SLUG table (CAT-03)', () => {
  it('documents all six UGC PostCategory → Subito slug mappings', () => {
    expect(POST_CATEGORY_TO_SLUG).toEqual({
      furniture: 'arredamento-casalinghi',
      tech: 'informatica',
      books: 'libri-riviste',
      apparel: 'abbigliamento-accessori',
      kitchenware: 'arredamento-casalinghi',
      others: 'usato',
    });
  });
});

describe('INFERRED_CATEGORY_TO_SLUG table (CAT-03)', () => {
  it('documents title-inference bucket → Subito slug mappings', () => {
    expect(INFERRED_CATEGORY_TO_SLUG).toEqual({
      furniture: 'arredamento-casalinghi',
      tech: 'informatica',
      apparel: 'abbigliamento-accessori',
      books: 'libri-riviste',
      home_decor: 'arredamento-casalinghi',
    });
  });
});
