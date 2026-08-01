import { describe, expect, it } from 'vitest';
import { excludeReportedIds, filterByZone, filterMapListings } from './filters';
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

describe('filterByZone', () => {
  it('returns all zoned listings when zone is All', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', zone: 'lido_murano' },
      { ...baseListing, id: '33333333-3333-3333-3333-333333333333', zone: null },
    ];

    expect(filterByZone(listings, 'All')).toHaveLength(2);
  });

  it('excludes wrong zone', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', zone: 'mestre_marghera' },
    ];

    expect(filterByZone(listings, 'centro_storico')).toHaveLength(1);
    expect(filterByZone(listings, 'centro_storico')[0]?.zone).toBe('centro_storico');
  });

  it('excludes zone-null rows from feed helpers', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '33333333-3333-3333-3333-333333333333', zone: null },
    ];

    expect(filterByZone(listings, 'All')).toEqual([baseListing]);
    expect(filterByZone(listings, 'centro_storico')).toEqual([baseListing]);
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
