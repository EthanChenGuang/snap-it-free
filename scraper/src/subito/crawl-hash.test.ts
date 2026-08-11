import { describe, expect, it } from 'vitest';
import { contentHash } from '../shared/dedupe.js';
import { crawlContentHash, crawlHashForListing } from './crawl-hash.js';

describe('crawlContentHash', () => {
  const base = {
    title: 'mobiletto legno',
    price: '0 €',
    images:
      'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710',
    posted_at: '2026-08-11T11:00:50.000Z',
  };

  it('produces stable sha256 hex', () => {
    const hash = crawlContentHash(base);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(crawlContentHash(base)).toBe(hash);
  });

  it('changes when price changes', () => {
    const hash1 = crawlContentHash(base);
    const hash2 = crawlContentHash({ ...base, price: '10 €' });
    expect(hash1).not.toBe(hash2);
  });

  it('is distinct from persist contentHash formula', () => {
    const crawlHash = crawlContentHash(base);
    const persistHash = contentHash({
      source: 'subito',
      external_id: '656979545',
      title: base.title,
      photo_url: base.images,
      external_url: 'https://www.subito.it/test.htm',
      lat: 45.434,
      lng: 12.338,
      zone: null,
      status: 'active',
      posted_at: new Date(base.posted_at),
      expires_at: new Date('2026-08-13T11:00:50.000Z'),
    });
    expect(crawlHash).not.toBe(persistHash);
  });
});

describe('crawlHashForListing', () => {
  it('joins image_urls for hash input', () => {
    const hash = crawlHashForListing({
      title: 'divano',
      price: '0 €',
      photo_url: 'https://images.sbito.it/a.jpg',
      image_urls: ['https://images.sbito.it/a.jpg', 'https://images.sbito.it/b.jpg'],
      posted_at: '2026-08-11T08:37:13.000Z',
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
