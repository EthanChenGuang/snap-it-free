import { describe, expect, it } from 'vitest';
import { CanonicalListingSchema } from './schema.js';

const validFixture = {
  source: 'subito' as const,
  external_id: 'subito-12345',
  title: 'regalo divano',
  photo_url: 'https://images.subito.it/photo.jpg',
  external_url: 'https://www.subito.it/annuncio/veneto/regalo-12345',
  lat: 45.434,
  lng: 12.338,
  zone: 'centro_storico' as const,
  status: 'active' as const,
  posted_at: new Date('2026-07-25T10:00:00Z'),
  expires_at: new Date('2026-07-27T10:00:00Z'),
  content_hash: 'a'.repeat(64),
};

describe('CanonicalListingSchema', () => {
  it('accepts a valid listing fixture', () => {
    const result = CanonicalListingSchema.parse(validFixture);
    expect(result.external_id).toBe('subito-12345');
    expect(result.source).toBe('subito');
  });

  it('throws when external_id is missing', () => {
    const { external_id: _, ...missingId } = validFixture;
    expect(() => CanonicalListingSchema.parse(missingId)).toThrow();
  });
});
