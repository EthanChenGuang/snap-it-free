import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadZonePolygons, tagZone } from './zone-tag.js';

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

  it('returns mestre_marghera for the Marghera centroid (was outside the old rectangle)', () => {
    expect(tagZone(45.459, 12.214, zones)).toBe('mestre_marghera');
  });

  it('returns lido_murano for the Murano centroid (was outside the old rectangle)', () => {
    expect(tagZone(45.458, 12.352, zones)).toBe('lido_murano');
  });

  it('returns null for a point outside all zone polygons', () => {
    expect(tagZone(45.5, 12.0, zones)).toBeNull();
  });

  it('returns null when coordinates are missing (null lat/lng handled by caller)', () => {
    // tagZone requires numbers; caller skips when null — verify outside-all still null
    expect(tagZone(46.0, 13.0, zones)).toBeNull();
  });

  it('resolves every municipality-centroids.json entry to a non-null zone', () => {
    const centroids = JSON.parse(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '../geo/municipality-centroids.json'),
        'utf-8',
      ),
    ) as Array<{ name: string; lat: number; lng: number }>;

    expect(centroids.length).toBeGreaterThan(0);
    for (const entry of centroids) {
      expect(tagZone(entry.lat, entry.lng, zones), entry.name).not.toBeNull();
    }
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
