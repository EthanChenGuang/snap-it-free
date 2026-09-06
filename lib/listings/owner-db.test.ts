import { describe, expect, it } from 'vitest';
import { mapOwnerListingRow } from './owner-db';

describe('mapOwnerListingRow', () => {
  it('normalizes Date timestamps to ISO strings', () => {
    const posted = new Date('2026-09-06T11:00:00.000Z');
    const expires = new Date('2026-09-13T11:00:00.000Z');

    expect(
      mapOwnerListingRow({
        id: '637fea62-16f8-4f84-bce0-7ae7c02140b6',
        source: 'ugc',
        title: 'Chair',
        photo_url: 'https://example.com/chair.jpg',
        photo_urls: ['https://example.com/chair.jpg'],
        external_url: '/listing/637fea62-16f8-4f84-bce0-7ae7c02140b6',
        lat: 45.434,
        lng: 12.338,
        zone: null,
        posted_at: posted,
        expires_at: expires,
        status: 'active',
        owner_user_id: '541d432c-309d-4e11-b153-62f827fc16ec',
        hidden_reason: null,
        description: 'desc 01',
      }),
    ).toMatchObject({
      posted_at: '2026-09-06T11:00:00.000Z',
      expires_at: '2026-09-13T11:00:00.000Z',
      source: 'ugc',
    });
  });
});
