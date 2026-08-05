import { describe, expect, it } from 'vitest';
import { matchesSubitoCategory } from './subito-categories';

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
