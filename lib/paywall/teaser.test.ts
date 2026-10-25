import { describe, expect, it } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { summarizeCityTeaser } from './teaser';

function listing(overrides: Partial<ListingRow> & Pick<ListingRow, 'id'>): ListingRow {
  return {
    source: 'subito',
    title: 'Sedia',
    photo_url: '',
    external_url: 'https://subito.it/annunci/1',
    lat: null,
    lng: null,
    zone: null,
    posted_at: '2026-10-25T10:00:00.000Z',
    expires_at: '2026-10-27T10:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

const rows: ListingRow[] = [
  listing({ id: 'v1', zone: 'centro_storico', photo_url: 'https://img/v1.jpg' }),
  listing({ id: 'm1', city: 'milano', photo_url: 'https://img/m1.jpg' }),
  listing({ id: 'm2', city: 'milano' }),
  listing({ id: 'm3', city: 'milano', photo_urls: ['https://img/m3a.jpg', 'https://img/m3b.jpg'] }),
  // Tagged Milano but geocoded in Rome: the feed excludes it, so the teaser must too.
  listing({ id: 'm4', city: 'milano', lat: 41.9, lng: 12.5, photo_url: 'https://img/m4.jpg' }),
  listing({ id: 'm5', city: 'milano', photo_url: 'https://img/m5.jpg' }),
];

describe('summarizeCityTeaser', () => {
  it('counts with the feed city predicate and picks photo thumbnails in order', () => {
    const teaser = summarizeCityTeaser(rows, 'milano', 2);
    expect(teaser.count).toBe(4);
    expect(teaser.thumbnails.map((thumb) => [thumb.id, thumb.photoUrl])).toEqual([
      ['m1', 'https://img/m1.jpg'],
      ['m3', 'https://img/m3a.jpg'],
    ]);
  });

  it('maps Venice zones to venice', () => {
    expect(summarizeCityTeaser(rows, 'venice').count).toBe(1);
  });

  it('reports zero honestly for a city with no listings', () => {
    expect(summarizeCityTeaser(rows, 'verona')).toEqual({ count: 0, thumbnails: [] });
  });
});
