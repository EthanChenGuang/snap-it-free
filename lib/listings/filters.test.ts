import { describe, expect, it } from 'vitest';
import {
  CONSUMER_CITY_FILTER_OPTIONS,
  excludeReportedIds,
  filterByRadiusKm,
  filterByZone,
  filterMapListings,
  hasValidCoords,
  listingConsumerCity,
  matchesConsumerCity,
  sortByDistance,
  sortByPostedAtDesc,
  sortByPostedAtDescThenDistance,
} from './filters';
import { CONSUMER_CITY_KEYS } from '@/lib/geo/italian-cities';
import type { ListingRow } from './types';

const baseListing: ListingRow = {
  id: '11111111-1111-1111-1111-111111111111',
  source: 'subito',
  title: 'Lampada gratis',
  photo_url: 'https://example.com/photo.jpg',
  external_url: 'https://subito.it/annunci/1',
  lat: 45.44,
  lng: 12.33,
  zone: 'centro_storico',
  posted_at: '2026-07-28T10:00:00.000Z',
  expires_at: '2026-07-30T10:00:00.000Z',
  status: 'active',
};

describe('CONSUMER_CITY_FILTER_OPTIONS', () => {
  it('orders cities by Chinese-resident population with other last', () => {
    expect(CONSUMER_CITY_FILTER_OPTIONS[0]).toBe('all');
    expect(CONSUMER_CITY_FILTER_OPTIONS.at(-1)).toBe('other');
    expect(CONSUMER_CITY_FILTER_OPTIONS.slice(1, -1)).toEqual([
      'milano',
      'roma',
      'prato',
      'torino',
      'firenze',
      'bologna',
      'napoli',
      'brescia',
      'venice',
      'genova',
      'padova',
      'perugia',
      'verona',
    ]);
    expect(new Set(CONSUMER_CITY_FILTER_OPTIONS.slice(1, -1))).toEqual(
      new Set(CONSUMER_CITY_KEYS),
    );
  });
});

describe('filterByZone', () => {
  it('returns zoned listings and zone-null rows with coords when zone is All (D-22)', () => {
    const padovaNoZone: ListingRow = {
      ...baseListing,
      id: '33333333-3333-3333-3333-333333333333',
      zone: null,
      city: 'padova',
      lat: 45.41,
      lng: 11.88,
    };
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', zone: 'lido_murano' },
      padovaNoZone,
      { ...baseListing, id: '44444444-4444-4444-4444-444444444444', zone: null, lat: null, lng: null },
    ];

    expect(filterByZone(listings, 'All')).toHaveLength(3);
    expect(filterByZone(listings, 'All')).toContainEqual(padovaNoZone);
  });

  it('excludes wrong zone', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', zone: 'mestre_marghera' },
    ];

    expect(filterByZone(listings, 'centro_storico')).toHaveLength(1);
    expect(filterByZone(listings, 'centro_storico')[0]?.zone).toBe('centro_storico');
  });

  it('excludes zone-null Padova row from Venice zone chips (D-22)', () => {
    const padovaNoZone: ListingRow = {
      ...baseListing,
      id: '33333333-3333-3333-3333-333333333333',
      zone: null,
      city: 'padova',
      lat: 45.41,
      lng: 11.88,
    };
    const listings: ListingRow[] = [baseListing, padovaNoZone];

    expect(filterByZone(listings, 'centro_storico')).toEqual([baseListing]);
    expect(filterByZone(listings, 'centro_storico')).not.toContainEqual(padovaNoZone);
  });

  it('excludes zone-null rows without coords from All', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '33333333-3333-3333-3333-333333333333', zone: null, lat: null, lng: null },
    ];

    expect(filterByZone(listings, 'All')).toEqual([baseListing]);
  });
});

describe('excludeReportedIds', () => {
  it('excludes listings whose id is in reportedIds', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222' },
    ];

    expect(excludeReportedIds(listings, [baseListing.id])).toHaveLength(1);
    expect(excludeReportedIds(listings, [baseListing.id])[0]?.id).toBe(
      '22222222-2222-2222-2222-222222222222',
    );
  });

  it('returns all listings when reportedIds is empty', () => {
    expect(excludeReportedIds([baseListing], [])).toEqual([baseListing]);
  });
});

describe('filterMapListings', () => {
  it('excludes rows with null lat or null lng', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', lat: null },
      { ...baseListing, id: '33333333-3333-3333-3333-333333333333', lng: null },
    ];

    expect(filterMapListings(listings)).toEqual([baseListing]);
  });
});

describe('listingConsumerCity', () => {
  it('maps Venice zones to venice (D-02, D-34)', () => {
    expect(listingConsumerCity({ ...baseListing, zone: 'centro_storico' })).toBe('venice');
    expect(listingConsumerCity({ ...baseListing, zone: 'mestre_marghera' })).toBe('venice');
    expect(listingConsumerCity({ ...baseListing, zone: 'lido_murano' })).toBe('venice');
  });

  it('maps padova city to padova', () => {
    expect(
      listingConsumerCity({
        ...baseListing,
        zone: null,
        city: 'padova',
        lat: 45.41,
        lng: 11.88,
      }),
    ).toBe('padova');
  });

  it('maps milano city to milano', () => {
    expect(
      listingConsumerCity({
        ...baseListing,
        zone: null,
        city: 'milano',
        lat: 45.46,
        lng: 9.19,
      }),
    ).toBe('milano');
  });

  it('returns null for zone-null non-catalog rows', () => {
    expect(
      listingConsumerCity({
        ...baseListing,
        zone: null,
        city: null,
        lat: 45.44,
        lng: 12.33,
      }),
    ).toBeNull();
  });

  it('returns null when city slug is nearest reference but coords sit outside its bbox (→ other)', () => {
    expect(
      listingConsumerCity({
        ...baseListing,
        zone: null,
        city: 'bologna',
        lat: 44.7,
        lng: 10.5,
      }),
    ).toBeNull();
  });
});

describe('matchesConsumerCity', () => {
  const padovaListing: ListingRow = {
    ...baseListing,
    id: '33333333-3333-3333-3333-333333333333',
    zone: null,
    city: 'padova',
    lat: 45.41,
    lng: 11.88,
  };

  it('passes all listings when city is all', () => {
    expect(matchesConsumerCity(baseListing, 'all')).toBe(true);
    expect(matchesConsumerCity(padovaListing, 'all')).toBe(true);
  });

  it('excludes padova rows when venice selected (D-35)', () => {
    expect(matchesConsumerCity(baseListing, 'venice')).toBe(true);
    expect(matchesConsumerCity(padovaListing, 'venice')).toBe(false);
  });

  it('excludes venice zone rows when padova selected', () => {
    expect(matchesConsumerCity(baseListing, 'padova')).toBe(false);
    expect(matchesConsumerCity(padovaListing, 'padova')).toBe(true);
  });

  it('matches nearest-reference listings when other selected', () => {
    const nearestReferenceListing: ListingRow = {
      ...baseListing,
      id: '66666666-6666-6666-6666-666666666666',
      zone: null,
      city: 'bologna',
      lat: 44.7,
      lng: 10.5,
    };
    expect(matchesConsumerCity(nearestReferenceListing, 'other')).toBe(true);
    expect(matchesConsumerCity(nearestReferenceListing, 'bologna')).toBe(false);
  });

  it('matches non-catalog listings when other selected', () => {
    const unknownCityListing: ListingRow = {
      ...baseListing,
      id: '44444444-4444-4444-4444-444444444444',
      zone: null,
      city: 'reggio-emilia',
      lat: 44.7,
      lng: 10.63,
    };
    const noCityListing: ListingRow = {
      ...baseListing,
      id: '55555555-5555-5555-5555-555555555555',
      zone: null,
      city: null,
      lat: 44.7,
      lng: 10.63,
    };

    expect(matchesConsumerCity(baseListing, 'other')).toBe(false);
    expect(matchesConsumerCity(padovaListing, 'other')).toBe(false);
    expect(matchesConsumerCity(unknownCityListing, 'other')).toBe(true);
    expect(matchesConsumerCity(noCityListing, 'other')).toBe(true);
  });
});

describe('hasValidCoords', () => {
  it('requires both lat and lng (D-27)', () => {
    expect(hasValidCoords(baseListing)).toBe(true);
    expect(hasValidCoords({ ...baseListing, lat: null })).toBe(false);
    expect(hasValidCoords({ ...baseListing, lng: null })).toBe(false);
  });
});

describe('filterByRadiusKm', () => {
  const center = { lat: 45.4371, lng: 12.3326 };
  const nearListing: ListingRow = {
    ...baseListing,
    id: '22222222-2222-2222-2222-222222222222',
    lat: 45.482,
    lng: 12.3326,
  };
  const farListing: ListingRow = {
    ...baseListing,
    id: '33333333-3333-3333-3333-333333333333',
    lat: 45.572,
    lng: 12.3326,
  };
  const noCoordListing: ListingRow = {
    ...baseListing,
    id: '44444444-4444-4444-4444-444444444444',
    lat: null,
    lng: null,
  };

  it('includes listings within radius and excludes beyond (D-21, D-23)', () => {
    const listings = [nearListing, farListing];
    const result = filterByRadiusKm(listings, center, 10);
    expect(result).toContainEqual(nearListing);
    expect(result).not.toContainEqual(farListing);
  });

  it('excludes listings without coordinates', () => {
    expect(filterByRadiusKm([noCoordListing], center, 10)).toEqual([]);
  });
});

describe('sortByDistance', () => {
  const center = { lat: 45.4371, lng: 12.3326 };
  const near: ListingRow = {
    ...baseListing,
    id: '22222222-2222-2222-2222-222222222222',
    lat: 45.45,
    lng: 12.33,
  };
  const far: ListingRow = {
    ...baseListing,
    id: '33333333-3333-3333-3333-333333333333',
    lat: 45.55,
    lng: 12.33,
  };

  it('orders nearest first (D-11)', () => {
    expect(sortByDistance([far, near], center).map((l) => l.id)).toEqual([
      near.id,
      far.id,
    ]);
  });
});

describe('sortByPostedAtDesc', () => {
  it('orders by posted_at descending', () => {
    const older: ListingRow = { ...baseListing, posted_at: '2026-07-28T10:00:00.000Z' };
    const newer: ListingRow = {
      ...baseListing,
      id: '22222222-2222-2222-2222-222222222222',
      posted_at: '2026-07-29T10:00:00.000Z',
    };
    expect(sortByPostedAtDesc([older, newer]).map((l) => l.id)).toEqual([newer.id, older.id]);
  });
});

describe('sortByPostedAtDescThenDistance', () => {
  const center = { lat: 45.4371, lng: 12.3326 };

  it('orders by posted_at descending first', () => {
    const olderNear: ListingRow = {
      ...baseListing,
      id: '22222222-2222-2222-2222-222222222222',
      lat: 45.45,
      lng: 12.33,
      posted_at: '2026-07-28T10:00:00.000Z',
    };
    const newerFar: ListingRow = {
      ...baseListing,
      id: '33333333-3333-3333-3333-333333333333',
      lat: 45.55,
      lng: 12.33,
      posted_at: '2026-07-29T10:00:00.000Z',
    };
    expect(sortByPostedAtDescThenDistance([olderNear, newerFar], center).map((l) => l.id)).toEqual([
      newerFar.id,
      olderNear.id,
    ]);
  });

  it('tie-breaks by distance when posted_at matches', () => {
    const near: ListingRow = {
      ...baseListing,
      id: '22222222-2222-2222-2222-222222222222',
      lat: 45.45,
      lng: 12.33,
    };
    const far: ListingRow = {
      ...baseListing,
      id: '33333333-3333-3333-3333-333333333333',
      lat: 45.55,
      lng: 12.33,
    };
    expect(sortByPostedAtDescThenDistance([far, near], center).map((l) => l.id)).toEqual([
      near.id,
      far.id,
    ]);
  });

  it('ignores distance when center is null', () => {
    const first: ListingRow = {
      ...baseListing,
      id: '22222222-2222-2222-2222-222222222222',
      lat: 45.55,
      lng: 12.33,
      posted_at: '2026-07-28T10:00:00.000Z',
    };
    const second: ListingRow = {
      ...baseListing,
      id: '33333333-3333-3333-3333-333333333333',
      lat: 45.45,
      lng: 12.33,
      posted_at: '2026-07-28T10:00:00.000Z',
    };
    expect(sortByPostedAtDescThenDistance([first, second], null).map((l) => l.id)).toEqual([
      first.id,
      second.id,
    ]);
  });
});
