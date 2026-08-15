import { describe, expect, it } from 'vitest';
import {
  isFacebookFreePrice,
  rejectReasonIfNotFacebookFree,
} from './filters.js';
import { isFacebookLocalPickup } from './enrich.js';

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

describe('isFacebookLocalPickup (D-18-04)', () => {
  it('accepts IN_PERSON delivery type', () => {
    expect(isFacebookLocalPickup(['IN_PERSON'])).toBe(true);
    expect(isFacebookLocalPickup(['IN_PERSON', 'SHIPPING_ON_SITE'])).toBe(true);
  });

  it('rejects shipping-only delivery types', () => {
    expect(isFacebookLocalPickup(['SHIPPING_ON_SITE'])).toBe(false);
    expect(isFacebookLocalPickup(['SHIPPING'])).toBe(false);
    expect(isFacebookLocalPickup([])).toBe(false);
    expect(isFacebookLocalPickup(undefined)).toBe(false);
  });
});
