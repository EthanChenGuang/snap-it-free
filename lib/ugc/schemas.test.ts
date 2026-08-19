import { describe, expect, it } from 'vitest';
import { SUBITO_CATEGORY_SLUGS } from '@/lib/listings/subito-categories';
import { CreateListingSchema, isWithinUgcVeniceBounds } from './schemas';

describe('CreateListingSchema', () => {
  const valid = {
    title: 'Sedia gratis',
    photoUrl: 'https://example.supabase.co/storage/v1/object/public/ugc-photos/u/s.jpg',
    lat: 45.434,
    lng: 12.338,
    postCategory: 'arredamento-casalinghi' as const,
  };

  it('accepts a valid listing payload with postCategory slug', () => {
    expect(CreateListingSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all Subito category slugs', () => {
    for (const postCategory of SUBITO_CATEGORY_SLUGS) {
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

  it('rejects legacy PostCategory picker values', () => {
    const result = CreateListingSchema.safeParse({ ...valid, postCategory: 'furniture' });
    expect(result.success).toBe(false);
  });

  it('rejects raw category field instead of postCategory', () => {
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

  it('rejects Padova pickup coordinates (UGC is Venice-only)', () => {
    expect(isWithinUgcVeniceBounds(45.4064, 11.8768)).toBe(false);
    const result = CreateListingSchema.safeParse({
      ...valid,
      lat: 45.4064,
      lng: 11.8768,
    });
    expect(result.success).toBe(false);
  });
});
