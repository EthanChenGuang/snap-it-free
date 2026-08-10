import { describe, expect, it } from 'vitest';
import { haversineKm } from './haversine';

const VENICE = { lat: 45.4371, lng: 12.3326 };
const MESTRE = { lat: 45.49, lng: 12.24 };

describe('haversineKm', () => {
  it('returns ~8–10 km for Venice → Mestre (FILT-05, D-22)', () => {
    const km = haversineKm(VENICE, MESTRE);
    expect(km).toBeGreaterThanOrEqual(8);
    expect(km).toBeLessThanOrEqual(10);
  });

  it('returns 0 for same point', () => {
    expect(haversineKm(VENICE, VENICE)).toBe(0);
  });
});
