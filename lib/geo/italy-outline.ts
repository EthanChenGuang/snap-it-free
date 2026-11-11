/**
 * Hand-simplified coastlines for the onboarding city map (decorative backdrop only; city bubbles
 * use the catalog's real city centres). Points are [lng, lat]. The frame crops to northern and
 * central Italy, where every catalog city sits.
 */

export type LngLat = readonly [number, number];

export const ITALY_MAP_FRAME = { lngMin: 6.6, lngMax: 15.6, latMin: 40.3, latMax: 47.1 } as const;

/** Mainland Italy, clockwise from the French border at Ventimiglia (south of the frame is clipped). */
export const ITALY_MAINLAND: readonly LngLat[] = [
  [7.53, 43.79], [8.2, 43.9], [8.48, 44.31], [8.93, 44.41], [9.5, 44.22], [9.85, 44.07], [10.25, 43.85],
  [10.32, 43.55], [10.5, 42.95], [11.1, 42.42], [11.8, 42.1], [12.25, 41.75], [12.9, 41.3], [13.55, 41.22],
  [14.05, 40.82], [14.35, 40.63], [14.75, 40.68], [15.0, 40.3], [15.6, 40.05], [16.2, 39.5], [17.2, 40.45],
  [18.0, 40.05], [18.35, 39.8], [18.5, 40.15], [17.95, 40.65], [16.85, 41.12], [15.9, 41.55],
  [16.15, 41.9], [15.4, 41.92], [14.7, 42.1], [14.2, 42.45], [13.85, 42.9], [13.6, 43.55], [12.6, 44.05],
  [12.3, 44.5], [12.4, 44.95], [12.25, 45.25], [12.4, 45.45], [13.1, 45.65], [13.75, 45.65], [13.9, 45.6],
  [13.7, 46.15], [13.4, 46.55], [12.4, 46.7], [12.2, 47.05], [11.2, 46.95], [10.45, 46.85], [10.15, 46.25],
  [9.0, 45.85], [8.45, 46.3], [7.85, 45.95], [7.05, 45.9], [6.8, 45.15], [7.05, 44.4],
];

export const SARDINIA: readonly LngLat[] = [
  [8.2, 40.95], [9.2, 41.25], [9.75, 40.8], [9.65, 39.2], [9.0, 39.1], [8.4, 38.95], [8.4, 39.8], [8.5, 40.6],
];

/** Neighbouring land (France, Switzerland, Austria, Slovenia, Croatia, Corsica), drawn under Italy. */
export const NEIGHBOURS: readonly (readonly LngLat[])[] = [
  [
    [5.5, 47.6], [19, 47.6], [19, 43.0], [15.9, 43.5], [15.2, 44.2], [14.45, 45.3], [13.85, 44.87], [13.5, 45.3],
    [13.0, 45.9], [11.0, 46.0], [8.0, 45.5], [7.4, 43.75], [7.0, 43.55], [6.5, 43.1], [5.5, 43.1],
  ],
  [[9.4, 43.0], [9.55, 42.6], [9.4, 41.4], [9.1, 41.4], [8.6, 41.9], [8.7, 42.6]],
];

/** Equirectangular projection of the frame onto a `width` × `height` box (north up). */
export function projectToFrame([lng, lat]: LngLat, width: number, height: number): { x: number; y: number } {
  const f = ITALY_MAP_FRAME;
  return {
    x: ((lng - f.lngMin) / (f.lngMax - f.lngMin)) * width,
    y: ((f.latMax - lat) / (f.latMax - f.latMin)) * height,
  };
}

/** Width / height of the frame once longitude is scaled by cos(mid-latitude). */
export const ITALY_MAP_ASPECT = (() => {
  const f = ITALY_MAP_FRAME;
  const kx = Math.cos((((f.latMin + f.latMax) / 2) * Math.PI) / 180);
  return ((f.lngMax - f.lngMin) * kx) / (f.latMax - f.latMin);
})();

export function outlinePath(points: readonly LngLat[], width: number, height: number): string {
  return (
    points
      .map((point, index) => {
        const { x, y } = projectToFrame(point, width, height);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + 'Z'
  );
}
