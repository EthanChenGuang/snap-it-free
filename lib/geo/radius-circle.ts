type LngLat = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

/** Destination point given start, bearing (deg), and distance (km). */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number,
): LngLat {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const angular = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

/** GeoJSON polygon approximating a circle on the spheroid. */
export function createCirclePolygon(
  center: LngLat,
  radiusKm: number,
  steps = 64,
): GeoJSON.Polygon {
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * 360;
    const point = destinationPoint(center.lat, center.lng, bearing, radiusKm);
    ring.push([point.lng, point.lat]);
  }
  return { type: 'Polygon', coordinates: [ring] };
}

/** Radar sweep wedge as GeoJSON polygon (center → arc → center). */
export function createRadarSector(
  center: LngLat,
  radiusKm: number,
  bearingDeg: number,
  spreadDeg = 48,
): GeoJSON.Polygon {
  const ring: [number, number][] = [[center.lng, center.lat]];
  const start = bearingDeg - spreadDeg / 2;
  const end = bearingDeg + spreadDeg / 2;
  const steps = 28;

  for (let i = 0; i <= steps; i += 1) {
    const bearing = start + ((end - start) * i) / steps;
    const point = destinationPoint(center.lat, center.lng, bearing, radiusKm);
    ring.push([point.lng, point.lat]);
  }
  ring.push([center.lng, center.lat]);

  return { type: 'Polygon', coordinates: [ring] };
}

/** Axis-aligned bounds enclosing a radius circle (for fitBounds). */
export function boundsForRadiusKm(
  center: LngLat,
  radiusKm: number,
): [[number, number], [number, number]] {
  const north = destinationPoint(center.lat, center.lng, 0, radiusKm);
  const south = destinationPoint(center.lat, center.lng, 180, radiusKm);
  const east = destinationPoint(center.lat, center.lng, 90, radiusKm);
  const west = destinationPoint(center.lat, center.lng, 270, radiusKm);

  return [
    [west.lng, south.lat],
    [east.lng, north.lat],
  ];
}
