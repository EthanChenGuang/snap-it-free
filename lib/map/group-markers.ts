import type { ListingRow } from '@/lib/listings/types';

export type ListingGroup = {
  key: string;
  listings: ListingRow[];
  lat: number;
  lng: number;
};

export function groupListingsByCoords(listings: ListingRow[]): ListingGroup[] {
  const groups = new Map<string, ListingRow[]>();

  for (const listing of listings) {
    const lat = listing.lat ?? 0;
    const lng = listing.lng ?? 0;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(listing);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([key, groupListings]) => ({
    key,
    listings: groupListings,
    lat: groupListings[0]?.lat ?? 0,
    lng: groupListings[0]?.lng ?? 0,
  }));
}

export function cycleGroupSelection(group: ListingGroup, currentId: string | null): string {
  if (group.listings.length === 0) return currentId ?? '';
  if (!currentId) return group.listings[0]!.id;
  const index = group.listings.findIndex((listing) => listing.id === currentId);
  const next = index < 0 ? 0 : (index + 1) % group.listings.length;
  return group.listings[next]!.id;
}
