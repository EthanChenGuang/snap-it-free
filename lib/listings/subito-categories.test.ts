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
});

describe('getSubitoCategoryLabel', () => {
  it('returns Italian catalog label by default', () => {
    expect(getSubitoCategoryLabel('informatica', 'it')).toBe('Informatica');
    expect(getSubitoCategoryLabel('all', 'it')).toBe('Tutte');
  });

  it('returns category_en when locale is en and column populated (D-31)', () => {
    expect(
      getSubitoCategoryLabel('informatica', 'en', {
        category_en: 'Computing',
        category_zh: '电脑',
      }),
    ).toBe('Computing');
  });

  it('returns category_zh when locale is zh and column populated (D-31)', () => {
    expect(
      getSubitoCategoryLabel('informatica', 'zh', {
        category_en: 'Computing',
        category_zh: '电脑',
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
