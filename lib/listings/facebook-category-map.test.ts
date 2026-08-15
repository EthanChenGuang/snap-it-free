import { describe, expect, it } from 'vitest';
import {
  FACEBOOK_CATEGORY_TO_SUBITO_SLUG,
  mapFacebookCategoryToSlug,
} from './facebook-category-map';

describe('mapFacebookCategoryToSlug (CAT-03)', () => {
  it('maps Wave 0 fixture chair category to arredamento-casalinghi', () => {
    expect(mapFacebookCategoryToSlug('847807938447238')).toBe('arredamento-casalinghi');
  });

  it('maps Wave 0 fixture books category to libri-riviste', () => {
    expect(mapFacebookCategoryToSlug('847807938447239')).toBe('libri-riviste');
  });

  it('accepts numeric category IDs', () => {
    expect(mapFacebookCategoryToSlug(847807938447238)).toBe('arredamento-casalinghi');
  });

  it('returns null for unmapped IDs (D-18-52)', () => {
    expect(mapFacebookCategoryToSlug('unknown')).toBeNull();
    expect(mapFacebookCategoryToSlug(null)).toBeNull();
    expect(mapFacebookCategoryToSlug(undefined)).toBeNull();
  });

  it('documents seeded FACEBOOK_CATEGORY_TO_SUBITO_SLUG entries', () => {
    expect(FACEBOOK_CATEGORY_TO_SUBITO_SLUG).toEqual({
      '847807938447238': 'arredamento-casalinghi',
      '847807938447239': 'libri-riviste',
    });
  });
});
