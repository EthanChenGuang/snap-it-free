import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { VeniceZoneType } from './schema.js';

export type ZonePolygon = {
  id: VeniceZoneType;
  polygon: Polygon;
};

const geoDir = join(dirname(fileURLToPath(import.meta.url)), '../geo');

function readGeoJson(filename: string): FeatureCollection {
  return JSON.parse(readFileSync(join(geoDir, filename), 'utf-8')) as FeatureCollection;
}

function polygonFromCollection(collection: FeatureCollection, zoneId: VeniceZoneType): ZonePolygon {
  const feature = collection.features.find(
    (f) => f.geometry.type === 'Polygon' && f.properties?.zone === zoneId,
  );
  if (!feature || feature.geometry.type !== 'Polygon') {
    throw new Error(`Missing polygon for zone ${zoneId}`);
  }
  return { id: zoneId, polygon: feature.geometry };
}

let cachedZones: ZonePolygon[] | null = null;

export function loadZonePolygons(): ZonePolygon[] {
  if (!cachedZones) {
    cachedZones = [
      polygonFromCollection(readGeoJson('centro-storico.geojson'), 'centro_storico'),
      polygonFromCollection(readGeoJson('mestre-marghera.geojson'), 'mestre_marghera'),
      polygonFromCollection(readGeoJson('lido-murano.geojson'), 'lido_murano'),
    ];
  }
  return cachedZones;
}

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
