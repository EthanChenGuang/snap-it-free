import { describe, expect, it } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { lockedPreviewPhotos } from './locked-preview';

const row = (id: string, photo_url: string): ListingRow => ({
  id,
  source: 'subito',
  title: `Private title ${id}`,
  photo_url,
  external_url: 'https://subito.it/annunci/1',
  lat: 45.44,
  lng: 12.33,
  zone: null,
  posted_at: '2026-10-25T10:00:00.000Z',
  expires_at: '2026-10-27T10:00:00.000Z',
  status: 'active',
});

describe('lockedPreviewPhotos', () => {
  it('keeps only id and photo, skipping rows without a photo', () => {
    const photos = lockedPreviewPhotos([row('a', 'https://img/a.jpg'), row('b', ''), row('c', 'https://img/c.jpg')], 2);
    expect(photos).toEqual([
      { id: 'a', photoUrl: 'https://img/a.jpg' },
      { id: 'c', photoUrl: 'https://img/c.jpg' },
    ]);
  });
});
