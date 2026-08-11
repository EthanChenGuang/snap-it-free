import { describe, expect, it } from 'vitest';
import { getSubitoCategoryLabel, matchesAnySubitoCategories, matchesSubitoCategory } from './subito-categories';

describe('matchesSubitoCategory', () => {
  it('prefers listing.category DB slug over title inference (D-29)', () => {
    const listing = {
      title: 'Divano in ottime condizioni',
      category: 'informatica',
    };
    expect(matchesSubitoCategory(listing, 'informatica')).toBe(true);
    expect(matchesSubitoCategory(listing, 'arredamento-casalinghi')).toBe(false);
  });

  it('returns true for all when selected is all', () => {
    expect(
      matchesSubitoCategory({ title: 'anything', category: null }, 'all'),
    ).toBe(true);
  });

  it('falls back to title inference when category is null', () => {
    expect(
      matchesSubitoCategory({ title: 'Monitor 24 pollici', category: null }, 'informatica'),
    ).toBe(true);
  });

  it('returns false for facebook source with null category (D-09)', () => {
    expect(
      matchesSubitoCategory(
        { source: 'facebook', title: 'Monitor 24 pollici', category: null },
        'informatica',
      ),
    ).toBe(false);
  });

  it('falls back to title inference when DB slug is unknown (D-18)', () => {
    expect(
      matchesSubitoCategory(
        { title: 'Monitor 24 pollici', category: 'bogus-slug' },
        'informatica',
      ),
    ).toBe(true);
    expect(
      matchesSubitoCategory(
        { title: 'Monitor 24 pollici', category: 'bogus-slug' },
        'arredamento-casalinghi',
      ),
    ).toBe(false);
  });

  it("matches unresolved (null-category) listings against the 'usato' catch-all", () => {
    expect(
      matchesSubitoCategory({ title: 'quaderno vuoto', category: null }, 'usato'),
    ).toBe(true);
  });

  it("does not match a listing that resolves to a different specific category against 'usato'", () => {
    expect(
      matchesSubitoCategory({ title: 'sedia da ufficio', category: null }, 'usato'),
    ).toBe(false);
  });

  it("still matches listings literally tagged 'usato' in the DB (regression)", () => {
    expect(
      matchesSubitoCategory({ title: 'anything', category: 'usato' }, 'usato'),
    ).toBe(true);
  });
});

describe('getSubitoCategoryLabel', () => {
  it('returns Italian catalog label by default', () => {
    expect(getSubitoCategoryLabel('informatica', 'it')).toBe('Informatica');
    expect(getSubitoCategoryLabel('all', 'it')).toBe('Tutte');
  });

  it('returns category_en when locale is en and column populated (D-31)', () => {
    expect(
      getSubitoCategoryLabel('informatica', 'en', {
        translations: {
          category_en: 'Computing',
          category_zh: '电脑',
        },
      }),
    ).toBe('Computing');
  });

  it('returns category_zh when locale is zh and column populated (D-31)', () => {
    expect(
      getSubitoCategoryLabel('informatica', 'zh', {
        translations: {
          category_en: 'Computing',
          category_zh: '电脑',
        },
      }),
    ).toBe('电脑');
  });
});

describe('matchesAnySubitoCategories', () => {
  const uncategorizedListing = { title: 'Oggetto generico', category: null };

  it('returns true when no categories selected (D-44)', () => {
    expect(matchesAnySubitoCategories(uncategorizedListing, [])).toBe(true);
  });

  it('matches any selected slug with OR logic (D-40)', () => {
    const listing = { title: 'Monitor 24 pollici', category: 'informatica' };
    expect(matchesAnySubitoCategories(listing, ['informatica', 'arredamento-casalinghi'])).toBe(
      true,
    );
    expect(matchesAnySubitoCategories(listing, ['arredamento-casalinghi', 'abbigliamento-accessori'])).toBe(
      false,
    );
  });

  it('returns false for uncategorized listing when filter active (D-44)', () => {
    expect(matchesAnySubitoCategories(uncategorizedListing, ['informatica'])).toBe(false);
  });
});
