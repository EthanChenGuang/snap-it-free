import { describe, expect, it } from 'vitest';
import { CreateListingSchema } from './schemas';

describe('CreateListingSchema', () => {
  const valid = {
    title: 'Sedia gratis',
    photoUrl: 'https://example.supabase.co/storage/v1/object/public/ugc-photos/u/s.jpg',
    lat: 45.434,
    lng: 12.338,
    postCategory: 'furniture' as const,
  };

  it('accepts a valid listing payload with postCategory', () => {
    expect(CreateListingSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all six PostCategory enum values (D-11)', () => {
    for (const postCategory of [
      'furniture',
      'tech',
      'books',
      'apparel',
      'kitchenware',
      'others',
    ] as const) {
      expect(CreateListingSchema.safeParse({ ...valid, postCategory }).success).toBe(true);
    }
  });

  it('rejects missing postCategory', () => {
    const { postCategory: _, ...withoutCategory } = valid;
    const result = CreateListingSchema.safeParse(withoutCategory);
    expect(result.success).toBe(false);
  });

  it('rejects invalid postCategory enum value', () => {
    const result = CreateListingSchema.safeParse({ ...valid, postCategory: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects raw category slug instead of postCategory (V5)', () => {
    const { postCategory: _, ...rest } = valid;
    const result = CreateListingSchema.safeParse({
      ...rest,
      category: 'informatica',
    });
    expect(result.success).toBe(false);
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
