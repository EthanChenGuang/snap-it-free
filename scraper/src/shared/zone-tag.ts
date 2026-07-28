import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, Polygon } from 'geojson';
import type { VeniceZoneType } from './schema.js';

export type ZonePolygon = {
  id: VeniceZoneType;
  polygon: Polygon;
};

export function tagZone(lat: number, lng: number, zones: ZonePolygon[]): VeniceZoneType | null {
  const pt: Feature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {},
  };

  for (const z of zones) {
    if (booleanPointInPolygon(pt, z.polygon)) return z.id;
  }
  return null;
}
