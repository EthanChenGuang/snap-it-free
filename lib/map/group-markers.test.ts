import { describe, expect, it } from 'vitest';
import { groupListingsByCoords, cycleGroupSelection } from './group-markers';
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

describe('groupListingsByCoords', () => {
  it('merges listings at identical coordinates', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', title: 'Second item' },
      {
        ...baseListing,
        id: '33333333-3333-3333-3333-333333333333',
        lat: 45.459,
        lng: 12.214,
      },
    ];

    const groups = groupListingsByCoords(listings);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.listings.length === 2)?.listings).toHaveLength(2);
  });

  it('groups null coordinates at 0,0 bucket', () => {
    const listings: ListingRow[] = [
      baseListing,
      { ...baseListing, id: '22222222-2222-2222-2222-222222222222', lat: null },
    ];

    expect(groupListingsByCoords(listings)).toHaveLength(2);
  });
});

describe('cycleGroupSelection', () => {
  const group = groupListingsByCoords([
    baseListing,
    { ...baseListing, id: '22222222-2222-2222-2222-222222222222' },
    { ...baseListing, id: '33333333-3333-3333-3333-333333333333' },
  ])[0]!;

  it('selects first listing when none selected', () => {
    expect(cycleGroupSelection(group, null)).toBe(baseListing.id);
  });

  it('cycles through collocated listings and wraps to first', () => {
    expect(cycleGroupSelection(group, baseListing.id)).toBe(
      '22222222-2222-2222-2222-222222222222',
    );
    expect(cycleGroupSelection(group, '22222222-2222-2222-2222-222222222222')).toBe(
      '33333333-3333-3333-3333-333333333333',
    );
    expect(cycleGroupSelection(group, '33333333-3333-3333-3333-333333333333')).toBe(
      baseListing.id,
    );
  });
});
