import { describe, expect, it } from 'vitest';
import { CreateListingSchema } from './schemas';

describe('CreateListingSchema', () => {
  const valid = {
    title: 'Sedia gratis',
    photoUrl: 'https://example.supabase.co/storage/v1/object/public/ugc-photos/u/s.jpg',
    lat: 45.434,
    lng: 12.338,
  };

  it('accepts a valid listing payload', () => {
    expect(CreateListingSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = CreateListingSchema.safeParse({ ...valid, title: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects lat outside Venice bounds', () => {
    const result = CreateListingSchema.safeParse({ ...valid, lat: 44.9 });
    expect(result.success).toBe(false);
  });

  it('rejects lng outside Venice bounds', () => {
    const result = CreateListingSchema.safeParse({ ...valid, lng: 12.0 });
    expect(result.success).toBe(false);
  });
});
