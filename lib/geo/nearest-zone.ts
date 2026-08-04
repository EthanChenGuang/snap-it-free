import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import type { VeniceZone } from '@/lib/listings/types';

/** Client-safe approximate zone from coordinates (display + fallback pin). */
export function nearestVeniceZone(lat: number, lng: number): VeniceZone {
  let best: VeniceZone = 'centro_storico';
  let bestDist = Infinity;

  for (const zone of Object.keys(ZONE_CENTERS) as VeniceZone[]) {
    const center = ZONE_CENTERS[zone];
    const dist = (lat - center.lat) ** 2 + (lng - center.lng) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = zone;
    }
  }

  return best;
}
