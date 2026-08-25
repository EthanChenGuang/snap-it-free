'use client';

import { useMemo } from 'react';
import { useDistanceCenter } from '@/hooks/useDistanceCenter';
import { haversineKm } from '@/lib/geo/haversine';
import type { ListingRow } from '@/lib/listings/types';

/** Distance from active browse/GPS center to a listing, in meters (detail page). */
export function useListingDistanceMeters(listing: ListingRow): number | null {
  const { center } = useDistanceCenter(false);

  return useMemo(() => {
    if (listing.lat == null || listing.lng == null) return null;
    const km = haversineKm(center, { lat: listing.lat, lng: listing.lng });
    return km * 1000;
  }, [listing.lat, listing.lng, center]);
}
