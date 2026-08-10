import type { ListingGroup } from './group-markers';
import { resolveListingMapCoord } from './venice-land-coords';

export type MapDisplayPin =
  | {
      kind: 'cluster';
      key: string;
      lat: number;
      lng: number;
      count: number;
      listings: ListingGroup['listings'];
    }
  | {
      kind: 'listing';
      listingId: string;
      lat: number;
      lng: number;
      listing: ListingGroup['listings'][number];
    };

const CLUSTER_ZOOM_THRESHOLD = 13;

export function resolveGroupPins(group: ListingGroup): Array<{ listingId: string; lat: number; lng: number }> {
  const reserved = new Set<number>();
  return group.listings.map((listing) => {
    const coord = resolveListingMapCoord(listing, group.listings.length, reserved);
    return { listingId: listing.id, lat: coord.lat, lng: coord.lng };
  });
}

export function buildMapDisplayPins(
  groups: ListingGroup[],
  options: { zoom: number; expandedGroupKey: string | null },
): MapDisplayPin[] {
  const pins: MapDisplayPin[] = [];

  for (const group of groups) {
    const expanded =
      options.expandedGroupKey === group.key || options.zoom >= CLUSTER_ZOOM_THRESHOLD;

    if (!expanded && group.listings.length > 1) {
      pins.push({
        kind: 'cluster',
        key: group.key,
        lat: group.lat,
        lng: group.lng,
        count: group.listings.length,
        listings: group.listings,
      });
      continue;
    }

    for (const pin of resolveGroupPins(group)) {
      const listing = group.listings.find((item) => item.id === pin.listingId);
      if (!listing) continue;
      pins.push({
        kind: 'listing',
        listingId: pin.listingId,
        lat: pin.lat,
        lng: pin.lng,
        listing,
      });
    }
  }

  return pins;
}

export function fitBoundsForPins(pins: Array<{ lat: number; lng: number }>): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} | null {
  if (pins.length === 0) return null;
  let minLat = pins[0]!.lat;
  let maxLat = pins[0]!.lat;
  let minLng = pins[0]!.lng;
  let maxLng = pins[0]!.lng;
  for (const pin of pins) {
    minLat = Math.min(minLat, pin.lat);
    maxLat = Math.max(maxLat, pin.lat);
    minLng = Math.min(minLng, pin.lng);
    maxLng = Math.max(maxLng, pin.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}
