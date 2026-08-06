import type { ListingRow, VeniceZone } from '@/lib/listings/types';

export type LandCoord = {
  lat: number;
  lng: number;
  district: string;
};

/**
 * Pre-validated land coordinates inside Venice sestieri and mainland/island zones.
 * Chosen on built-up areas — avoids Grand Canal / lagoon centers where radial jitter landed in water.
 */
export const CENTRO_STORICO_LAND: LandCoord[] = [
  { lat: 45.4462, lng: 12.3268, district: 'Cannaregio' },
  { lat: 45.4448, lng: 12.3295, district: 'Cannaregio' },
  { lat: 45.4425, lng: 12.3242, district: 'Cannaregio' },
  { lat: 45.441, lng: 12.3318, district: 'Cannaregio' },
  { lat: 45.4385, lng: 12.3275, district: 'San Polo' },
  { lat: 45.4368, lng: 12.3302, district: 'San Polo' },
  { lat: 45.4395, lng: 12.3228, district: 'Santa Croce' },
  { lat: 45.4412, lng: 12.3205, district: 'Santa Croce' },
  { lat: 45.4372, lng: 12.3335, district: 'San Marco' },
  { lat: 45.4348, lng: 12.3368, district: 'San Marco' },
  { lat: 45.4335, lng: 12.3395, district: 'San Marco' },
  { lat: 45.4322, lng: 12.3342, district: 'San Marco' },
  { lat: 45.4365, lng: 12.3465, district: 'Castello' },
  { lat: 45.4342, lng: 12.3498, district: 'Castello' },
  { lat: 45.4328, lng: 12.3525, district: 'Castello' },
  { lat: 45.4315, lng: 12.3442, district: 'Castello' },
  { lat: 45.4305, lng: 12.3245, district: 'Dorsoduro' },
  { lat: 45.4288, lng: 12.3272, district: 'Dorsoduro' },
  { lat: 45.4312, lng: 12.3208, district: 'Dorsoduro' },
  { lat: 45.4295, lng: 12.3235, district: 'Dorsoduro' },
  { lat: 45.4275, lng: 12.3268, district: 'Dorsoduro' },
  { lat: 45.4262, lng: 12.3295, district: 'Giudecca' },
  { lat: 45.4248, lng: 12.3322, district: 'Giudecca' },
  { lat: 45.4455, lng: 12.3338, district: 'Cannaregio' },
  { lat: 45.4432, lng: 12.3365, district: 'Cannaregio' },
  { lat: 45.4408, lng: 12.3342, district: 'San Polo' },
  { lat: 45.4355, lng: 12.3288, district: 'San Marco' },
  { lat: 45.4338, lng: 12.3315, district: 'San Marco' },
  { lat: 45.4378, lng: 12.3412, district: 'Castello' },
  { lat: 45.4352, lng: 12.3438, district: 'Castello' },
  { lat: 45.4325, lng: 12.3388, district: 'Castello' },
  { lat: 45.4308, lng: 12.3188, district: 'Dorsoduro' },
  { lat: 45.4282, lng: 12.3215, district: 'Dorsoduro' },
  { lat: 45.4422, lng: 12.3282, district: 'San Polo' },
  { lat: 45.4402, lng: 12.3255, district: 'Santa Croce' },
  { lat: 45.4382, lng: 12.3232, district: 'Santa Croce' },
  { lat: 45.4442, lng: 12.3322, district: 'Cannaregio' },
  { lat: 45.4418, lng: 12.3298, district: 'San Polo' },
  { lat: 45.4362, lng: 12.3378, district: 'San Marco' },
  { lat: 45.4345, lng: 12.3412, district: 'Castello' },
  { lat: 45.4318, lng: 12.3175, district: 'Dorsoduro' },
  { lat: 45.4298, lng: 12.3198, district: 'Dorsoduro' },
  { lat: 45.4278, lng: 12.3225, district: 'Dorsoduro' },
  { lat: 45.4258, lng: 12.3252, district: 'Giudecca' },
  { lat: 45.4438, lng: 12.3355, district: 'Cannaregio' },
  { lat: 45.4398, lng: 12.3312, district: 'San Polo' },
  { lat: 45.4375, lng: 12.3355, district: 'San Marco' },
  { lat: 45.4332, lng: 12.3472, district: 'Castello' },
];

export const MESTRE_MARGHERA_LAND: LandCoord[] = [
  { lat: 45.486, lng: 12.245, district: 'Mestre' },
  { lat: 45.488, lng: 12.248, district: 'Mestre' },
  { lat: 45.484, lng: 12.242, district: 'Mestre' },
  { lat: 45.482, lng: 12.238, district: 'Mestre' },
  { lat: 45.459, lng: 12.214, district: 'Marghera' },
  { lat: 45.461, lng: 12.218, district: 'Marghera' },
  { lat: 45.457, lng: 12.210, district: 'Marghera' },
  { lat: 45.490, lng: 12.252, district: 'Mestre' },
  { lat: 45.480, lng: 12.235, district: 'Mestre' },
  { lat: 45.463, lng: 12.220, district: 'Marghera' },
];

export const LIDO_MURANO_LAND: LandCoord[] = [
  { lat: 45.406, lng: 12.372, district: 'Lido' },
  { lat: 45.408, lng: 12.368, district: 'Lido' },
  { lat: 45.404, lng: 12.376, district: 'Lido' },
  { lat: 45.458, lng: 12.352, district: 'Murano' },
  { lat: 45.456, lng: 12.348, district: 'Murano' },
  { lat: 45.460, lng: 12.355, district: 'Murano' },
  { lat: 45.402, lng: 12.370, district: 'Lido' },
  { lat: 45.454, lng: 12.350, district: 'Murano' },
];

/** Shared scraper / municipality-centroid fallbacks — not safe for map display. */
const GENERIC_CENTROIDS: Array<{ lat: number; lng: number }> = [
  { lat: 45.434, lng: 12.338 },
  { lat: 45.434, lng: 12.339 },
];

export function landPoolForZone(zone: VeniceZone | null): LandCoord[] {
  if (zone === 'mestre_marghera') return MESTRE_MARGHERA_LAND;
  if (zone === 'lido_murano') return LIDO_MURANO_LAND;
  return CENTRO_STORICO_LAND;
}

export function isGenericCentroid(lat: number, lng: number): boolean {
  return GENERIC_CENTROIDS.some(
    (c) => Math.abs(c.lat - lat) < 0.002 && Math.abs(c.lng - lng) < 0.002,
  );
}

function stableSlot(id: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

/** Assign a unique land coordinate from the zone pool (deterministic per listing id). */
export function landCoordForListing(
  listing: ListingRow,
  reservedSlots: Set<number> = new Set(),
): LandCoord {
  const pool = landPoolForZone(listing.zone);

  // A collocated group can hold more listings than the pool has slots — a single
  // municipality centroid collects every listing for that city. Once every slot is
  // reserved the linear probe below has nothing left to find, so start a fresh round
  // instead of spinning forever. Overflow listings then stack evenly across the pool
  // rather than piling onto one coordinate. Comparing against the *current* pool's
  // length also keeps this correct when a group mixes zones with different pool sizes.
  if (reservedSlots.size >= pool.length) {
    reservedSlots.clear();
  }

  // Guaranteed to terminate: reservedSlots.size < pool.length on entry, so at least
  // one of the pool.length slots the probe walks through is free.
  let slot = stableSlot(listing.id, pool.length);
  while (reservedSlots.has(slot)) {
    slot = (slot + 1) % pool.length;
  }
  reservedSlots.add(slot);
  return pool[slot]!;
}

export function shouldUseLandPool(listing: ListingRow, groupSize: number): boolean {
  if (groupSize > 1) return true;
  if (listing.lat == null || listing.lng == null) return true;
  return isGenericCentroid(listing.lat, listing.lng);
}

export function resolveListingMapCoord(
  listing: ListingRow,
  groupSize: number,
  reservedSlots: Set<number>,
): { lat: number; lng: number } {
  if (!shouldUseLandPool(listing, groupSize)) {
    return { lat: listing.lat!, lng: listing.lng! };
  }
  const land = landCoordForListing(listing, reservedSlots);
  return { lat: land.lat, lng: land.lng };
}
