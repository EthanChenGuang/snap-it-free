import { beforeEach, describe, expect, it } from 'vitest';
import { toggleFavoriteId } from '@/lib/favorites/storage';
import { filterByZone } from './filters';
import type { ListingRow } from './types';

const VINTED_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const baseListing: ListingRow = {
  id: VINTED_ID,
  source: 'vinted',
  title: 'Lampada gratis',
  photo_url: 'https://example.com/photo.jpg',
  external_url: 'https://www.vinted.it/items/123456789',
  lat: 45.44,
  lng: 12.33,
  zone: 'centro_storico',
  posted_at: '2026-07-28T10:00:00.000Z',
  expires_at: '2026-07-30T10:00:00.000Z',
  status: 'active',
};

const subitoListing: ListingRow = {
  ...baseListing,
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  source: 'subito',
  external_url: 'https://subito.it/annunci/1',
};

describe('vinted favorites and filter compat (D-17-30)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes source=vinted listing in filterByZone All same as subito', () => {
    const listings = [subitoListing, baseListing];

    const filtered = filterByZone(listings, 'All');

    expect(filtered).toContainEqual(baseListing);
    expect(filtered).toHaveLength(2);
  });

  it('toggleFavoriteId accepts vinted listing UUID without source-specific branch', () => {
    const afterAdd = toggleFavoriteId(VINTED_ID);

    expect(afterAdd).toEqual([VINTED_ID]);
  });
});
