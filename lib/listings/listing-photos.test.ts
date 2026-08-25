import { describe, expect, it } from 'vitest';
import { listingPhotoUrls } from './listing-photos';

describe('listingPhotoUrls', () => {
  it('returns photo_urls when present', () => {
    expect(
      listingPhotoUrls({
        photo_url: 'https://example.com/a.jpg',
        photo_urls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      }),
    ).toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
  });

  it('falls back to photo_url when gallery missing', () => {
    expect(
      listingPhotoUrls({
        photo_url: 'https://example.com/a.jpg',
        photo_urls: null,
      }),
    ).toEqual(['https://example.com/a.jpg']);
  });
});
