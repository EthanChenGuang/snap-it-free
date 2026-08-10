import { describe, expect, it } from 'vitest';
import {
  boundsForRadiusKm,
  createCirclePolygon,
  destinationPoint,
} from './radius-circle';

describe('radius-circle', () => {
  it('destinationPoint moves roughly radiusKm north', () => {
    const start = { lat: 45.44, lng: 12.33 };
    const north = destinationPoint(start.lat, start.lng, 0, 10);
    expect(north.lat).toBeGreaterThan(start.lat);
    expect(Math.abs(north.lng - start.lng)).toBeLessThan(0.05);
  });

  it('createCirclePolygon closes ring', () => {
    const polygon = createCirclePolygon({ lat: 45.44, lng: 12.33 }, 10, 8);
    const ring = polygon.coordinates[0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBeGreaterThan(4);
  });

  it('boundsForRadiusKm wraps center', () => {
    const center = { lat: 45.44, lng: 12.33 };
    const [[west, south], [east, north]] = boundsForRadiusKm(center, 20);
    expect(west).toBeLessThan(center.lng);
    expect(east).toBeGreaterThan(center.lng);
    expect(south).toBeLessThan(center.lat);
    expect(north).toBeGreaterThan(center.lat);
  });
});
