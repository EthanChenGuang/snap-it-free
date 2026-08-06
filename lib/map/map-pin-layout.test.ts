import { describe, expect, it } from 'vitest';
import { groupListingsByCoords } from './group-markers';
import { buildMapDisplayPins, resolveGroupPins } from './map-pin-layout';
import {
  CENTRO_STORICO_LAND,
  isGenericCentroid,
  landCoordForListing,
  resolveListingMapCoord,
  shouldUseLandPool,
} from './venice-land-coords';
import type { ListingRow } from '@/lib/listings/types';

const baseListing: ListingRow = {
  id: '11111111-1111-1111-1111-111111111111',
  source: 'subito',
  title: 'Lampada gratis',
  photo_url: 'https://example.com/photo.jpg',
  external_url: 'https://subito.it/annunci/1',
  lat: 45.434,
  lng: 12.338,
  zone: 'centro_storico',
  posted_at: '2026-07-28T10:00:00.000Z',
  expires_at: '2026-07-30T10:00:00.000Z',
  status: 'active',
};

describe('venice-land-coords', () => {
  it('detects generic scraper centroids', () => {
    expect(isGenericCentroid(45.434, 12.338)).toBe(true);
    expect(isGenericCentroid(45.459, 12.214)).toBe(false);
  });

  it('assigns unique land coords for collocated listings', () => {
    const listings = Array.from({ length: 10 }, (_, i) => ({
      ...baseListing,
      id: `${i}`.padStart(36, '0'),
    }));
    const reserved = new Set<number>();
    const coords = listings.map((listing) => resolveListingMapCoord(listing, 10, reserved));
    const uniq = new Set(coords.map((c) => `${c.lat},${c.lng}`));
    expect(uniq.size).toBe(10);
    for (const coord of coords) {
      expect(CENTRO_STORICO_LAND.some((l) => l.lat === coord.lat && l.lng === coord.lng)).toBe(true);
    }
  });

  it('keeps distinct non-generic DB coordinates for singletons', () => {
    const listing = { ...baseListing, lat: 45.459, lng: 12.214, zone: 'mestre_marghera' as const };
    expect(shouldUseLandPool(listing, 1)).toBe(false);
    expect(resolveListingMapCoord(listing, 1, new Set())).toEqual({ lat: 45.459, lng: 12.214 });
  });
});

describe('map-pin-layout', () => {
  it('clusters collocated groups when zoomed out', () => {
    const group = groupListingsByCoords([
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222' },
    ])[0]!;

    const clustered = buildMapDisplayPins([group], { zoom: 11, expandedGroupKey: null });
    expect(clustered).toHaveLength(1);
    expect(clustered[0]?.kind).toBe('cluster');
  });

  it('expands to land pins when zoomed in or group expanded', () => {
    const group = groupListingsByCoords([
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222' },
    ])[0]!;

    const expanded = buildMapDisplayPins([group], { zoom: 11, expandedGroupKey: group.key });
    expect(expanded).toHaveLength(2);
    expect(expanded.every((pin) => pin.kind === 'listing')).toBe(true);

    const pins = resolveGroupPins(group);
    expect(new Set(pins.map((p) => `${p.lat},${p.lng}`)).size).toBe(2);
  });
});

describe('landCoordForListing', () => {
  it('is deterministic for the same listing id', () => {
    const a = landCoordForListing(baseListing);
    const b = landCoordForListing(baseListing);
    expect(a).toEqual(b);
  });

  it('terminates when the group is larger than the land pool', () => {
    // Pool exhaustion used to leave the linear probe spinning forever, pinning the
    // renderer at 100% CPU inside ListingMap's first render (260806-s5f).
    const reserved = new Set<number>();
    const coords = Array.from({ length: CENTRO_STORICO_LAND.length + 1 }, (_, i) =>
      landCoordForListing({ ...baseListing, id: `${i}`.padStart(36, '0') }, reserved),
    );

    expect(coords).toHaveLength(CENTRO_STORICO_LAND.length + 1);
    for (const coord of coords) {
      expect(CENTRO_STORICO_LAND).toContainEqual(coord);
    }
  });
});

describe('oversized collocated groups', () => {
  // Production shape: 102 Padova listings share one municipality centroid and carry
  // zone `null`, so they all fall back to the 48-slot centro storico pool.
  const oversized: ListingRow[] = Array.from({ length: 102 }, (_, i) => ({
    ...baseListing,
    id: `${i}`.padStart(36, '0'),
    lat: 45.406,
    lng: 11.877,
    zone: null,
  }));

  it('resolveGroupPins places every listing without hanging', () => {
    const group = groupListingsByCoords(oversized)[0]!;
    const pins = resolveGroupPins(group);

    expect(pins).toHaveLength(102);
    for (const pin of pins) {
      expect(CENTRO_STORICO_LAND).toContainEqual(
        expect.objectContaining({ lat: pin.lat, lng: pin.lng }),
      );
    }
  });

  it('buildMapDisplayPins expands an oversized group without hanging', () => {
    const group = groupListingsByCoords(oversized)[0]!;
    const pins = buildMapDisplayPins([group], { zoom: 15, expandedGroupKey: group.key });

    expect(pins).toHaveLength(102);
    expect(pins.every((pin) => pin.kind === 'listing')).toBe(true);
  });
});
