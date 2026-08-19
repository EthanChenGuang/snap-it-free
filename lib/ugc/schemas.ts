import { z } from 'zod';
import type { SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import { SUBITO_CATEGORY_SLUGS } from '@/lib/listings/subito-categories';

const postCategoryEnum = z.enum(
  SUBITO_CATEGORY_SLUGS as [SubitoRegaloSlug, ...SubitoRegaloSlug[]],
);

/** UGC posts and DB RLS are Venice-only — matches migration 012 bounds. */
export const UGC_VENICE_LAT_MIN = 45.0;
export const UGC_VENICE_LAT_MAX = 45.7;
export const UGC_VENICE_LNG_MIN = 12.1;
export const UGC_VENICE_LNG_MAX = 12.6;

export function isWithinUgcVeniceBounds(lat: number, lng: number): boolean {
  return (
    lat >= UGC_VENICE_LAT_MIN &&
    lat <= UGC_VENICE_LAT_MAX &&
    lng >= UGC_VENICE_LNG_MIN &&
    lng <= UGC_VENICE_LNG_MAX
  );
}

export const CreateListingSchema = z.object({
  title: z.string().trim().min(1).max(500),
  photoUrl: z.string().url(),
  lat: z.number().min(UGC_VENICE_LAT_MIN).max(UGC_VENICE_LAT_MAX),
  lng: z.number().min(UGC_VENICE_LNG_MIN).max(UGC_VENICE_LNG_MAX),
  description: z.string().max(2000).optional(),
  postCategory: postCategoryEnum,
});

export function createListingSchemaForUser(userId: string) {
  return CreateListingSchema.extend({
    photoUrl: z
      .string()
      .url()
      .refine((url) => url.includes(`/ugc-photos/${userId}/`), {
        message: 'Photo must be uploaded via /api/ugc/upload',
      }),
  });
}

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const ALLOWED_UPLOAD_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
