import { describe, expect, it } from 'vitest';
import { loadZonePolygons, tagZone } from './zone-tag';

describe('tagZone', () => {
  const zones = loadZonePolygons();

  it('returns centro_storico for a point inside the historic center polygon', () => {
    expect(tagZone(45.434, 12.338, zones)).toBe('centro_storico');
  });

  it('returns mestre_marghera for a point inside the mainland polygon', () => {
    expect(tagZone(45.486, 12.245, zones)).toBe('mestre_marghera');
  });

  it('returns lido_murano for a point inside the island polygon', () => {
    expect(tagZone(45.406, 12.372, zones)).toBe('lido_murano');
  });

  it('returns null for a point outside all zone polygons', () => {
    expect(tagZone(45.5, 12.0, zones)).toBeNull();
  });

  it('returns null for Mirano — inside Venice bbox but outside service zones', () => {
    expect(tagZone(45.4934, 12.1084, zones)).toBeNull();
  });

  it('returns null when coordinates are outside Venice bounds', () => {
    expect(tagZone(46.0, 13.0, zones)).toBeNull();
  });
});

describe('loadZonePolygons', () => {
  it('loads all three Venice zone polygons', () => {
    const zones = loadZonePolygons();
    expect(zones).toHaveLength(3);
    expect(zones.map((z) => z.id).sort()).toEqual([
      'centro_storico',
      'lido_murano',
      'mestre_marghera',
    ]);
  });
});
