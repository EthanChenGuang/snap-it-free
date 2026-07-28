import { describe, expect, it } from 'vitest';
import { tagZone, type ZonePolygon } from './zone-tag.js';
import type { Polygon } from 'geojson';

const centroStoricoPolygon: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [12.32, 45.42],
      [12.36, 45.42],
      [12.36, 45.45],
      [12.32, 45.45],
      [12.32, 45.42],
    ],
  ],
};

const zones: ZonePolygon[] = [
  { id: 'centro_storico', polygon: centroStoricoPolygon },
];

describe('tagZone', () => {
  it('returns centro_storico for a point inside the fixture polygon', () => {
    const zone = tagZone(45.434, 12.338, zones);
    expect(zone).toBe('centro_storico');
  });

  it('returns null for a point outside all zone polygons', () => {
    const zone = tagZone(45.5, 12.0, zones);
    expect(zone).toBeNull();
  });
});
