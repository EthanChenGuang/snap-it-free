import { describe, expect, it } from 'vitest';
import { contentHash } from './dedupe.js';
import type { CanonicalListing } from './schema.js';

const baseListing: Omit<CanonicalListing, 'content_hash'> = {
  source: 'subito',
  external_id: 'subito-999',
  title: 'regalo lampada',
  photo_url: 'https://images.subito.it/lamp.jpg',
  external_url: 'https://www.subito.it/annuncio/lamp-999',
  lat: 45.434,
  lng: 12.338,
  zone: 'centro_storico',
  status: 'active',
  posted_at: new Date('2026-07-25T10:00:00Z'),
  expires_at: new Date('2026-07-27T10:00:00Z'),
};

describe('contentHash', () => {
  it('produces identical SHA-256 hash for identical fields', () => {
    const hash1 = contentHash(baseListing);
    const hash2 = contentHash({ ...baseListing });
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hash when title changes', () => {
    const hash1 = contentHash(baseListing);
    const hash2 = contentHash({ ...baseListing, title: 'regalo tavolo' });
    expect(hash1).not.toBe(hash2);
  });
});
