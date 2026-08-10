/** Smart metric units: "350 m" under 1 km; "2.3 km" at 1 km+ (D-15). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
