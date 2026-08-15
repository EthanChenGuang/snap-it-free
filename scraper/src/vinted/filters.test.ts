import { describe, expect, it } from 'vitest';
import { isFreePrice, rejectReasonIfNotFree } from './filters.js';

describe('isFreePrice (D-17-01/02)', () => {
  it('returns true for numeric zero', () => {
    expect(isFreePrice(0)).toBe(true);
    expect(isFreePrice('0')).toBe(true);
  });

  it('returns true for "0.0" and "0.00"', () => {
    expect(isFreePrice('0.0')).toBe(true);
    expect(isFreePrice('0.00')).toBe(true);
  });

  it('returns false for non-zero numeric strings', () => {
    expect(isFreePrice('10.0')).toBe(false);
    expect(isFreePrice('4.35')).toBe(false);
    expect(isFreePrice('35')).toBe(false);
  });

  it('returns false for null, undefined, and empty string (D-17-02)', () => {
    expect(isFreePrice(null)).toBe(false);
    expect(isFreePrice(undefined)).toBe(false);
    expect(isFreePrice('')).toBe(false);
  });

  it('returns false for non-numeric junk to avoid NaN surprises', () => {
    expect(isFreePrice('gratis')).toBe(false);
    expect(isFreePrice('0 €')).toBe(false);
  });
});

describe('rejectReasonIfNotFree (D-17-04)', () => {
  it('returns not_free for non-zero/missing price', () => {
    expect(rejectReasonIfNotFree('4.35')).toBe('not_free');
    expect(rejectReasonIfNotFree(null)).toBe('not_free');
    expect(rejectReasonIfNotFree('')).toBe('not_free');
  });

  it('returns null for exactly zero', () => {
    expect(rejectReasonIfNotFree('0')).toBeNull();
    expect(rejectReasonIfNotFree(0)).toBeNull();
  });
});
