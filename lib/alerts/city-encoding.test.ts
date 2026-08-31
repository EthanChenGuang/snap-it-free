import { describe, expect, it } from 'vitest';
import { decodeAlertKeyword, encodeAlertKeyword, resolveAlertFields } from './city-encoding';

describe('city-encoding', () => {
  it('round-trips keyword and city', () => {
    const stored = encodeAlertKeyword('apple', 'venice');
    expect(stored).toBe('@city:venice@apple');
    expect(decodeAlertKeyword(stored)).toEqual({ keyword: 'apple', city: 'venice' });
  });

  it('encodes city-only alerts', () => {
    expect(encodeAlertKeyword(null, 'padova')).toBe('@city:padova@');
    expect(decodeAlertKeyword('@city:padova@')).toEqual({ keyword: null, city: 'padova' });
  });

  it('prefers explicit city column when present', () => {
    expect(
      resolveAlertFields({ keyword: '@city:venice@apple', city: 'milano' }),
    ).toEqual({ keyword: '@city:venice@apple', city: 'milano' });
  });

  it('decodes legacy keyword payload when city column is null', () => {
    expect(
      resolveAlertFields({ keyword: '@city:venice@apple', city: null }),
    ).toEqual({ keyword: 'apple', city: 'venice' });
  });
});
