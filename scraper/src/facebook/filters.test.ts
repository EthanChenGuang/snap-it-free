import { describe, expect, it } from 'vitest';
import {
  isFacebookFreePrice,
  rejectReasonIfNotFacebookFree,
} from './filters.js';

describe('isFacebookFreePrice (D-18-02)', () => {
  it('accepts 0, "0", and localized Gratis from price field', () => {
    expect(isFacebookFreePrice(0)).toBe(true);
    expect(isFacebookFreePrice('0')).toBe(true);
    expect(isFacebookFreePrice(null, 'Gratis')).toBe(true);
    expect(isFacebookFreePrice('0', 'Gratis')).toBe(true);
  });

  it('rejects non-zero amounts', () => {
    expect(isFacebookFreePrice('15')).toBe(false);
    expect(isFacebookFreePrice('15', '15 €')).toBe(false);
  });
});

describe('rejectReasonIfNotFacebookFree (D-18-03)', () => {
  it('returns price_ambiguous for missing price', () => {
    expect(rejectReasonIfNotFacebookFree(null)).toBe('price_ambiguous');
    expect(rejectReasonIfNotFacebookFree(undefined)).toBe('price_ambiguous');
    expect(rejectReasonIfNotFacebookFree('')).toBe('price_ambiguous');
  });

  it('returns null for free listings and not_free otherwise', () => {
    expect(rejectReasonIfNotFacebookFree('0')).toBeNull();
    expect(rejectReasonIfNotFacebookFree(null, 'Gratis')).toBeNull();
    expect(rejectReasonIfNotFacebookFree('10')).toBe('not_free');
  });
});
