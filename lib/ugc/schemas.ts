import { z } from 'zod';
import type { SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import { SUBITO_CATEGORY_SLUGS } from '@/lib/listings/subito-categories';
import {
  UGC_PICKUP_LAT_MAX,
  UGC_PICKUP_LAT_MIN,
  UGC_PICKUP_LNG_MAX,
  UGC_PICKUP_LNG_MIN,
  isWithinUgcPickupBounds,
} from '@/lib/geo/pickup-location';

const postCategoryEnum = z.enum(
  SUBITO_CATEGORY_SLUGS as [SubitoRegaloSlug, ...SubitoRegaloSlug[]],
);

export {
  isWithinUgcPickupBounds,
  UGC_PICKUP_LAT_MIN,
  UGC_PICKUP_LAT_MAX,
  UGC_PICKUP_LNG_MIN,
  UGC_PICKUP_LNG_MAX,
};

/** @deprecated Use isWithinUgcPickupBounds — kept for legacy imports during migration. */
export const UGC_VENICE_LAT_MIN = UGC_PICKUP_LAT_MIN;
/** @deprecated Use UGC_PICKUP_LAT_MAX */
export const UGC_VENICE_LAT_MAX = UGC_PICKUP_LAT_MAX;
/** @deprecated Use UGC_PICKUP_LNG_MIN */
export const UGC_VENICE_LNG_MIN = UGC_PICKUP_LNG_MIN;
/** @deprecated Use UGC_PICKUP_LNG_MAX */
export const UGC_VENICE_LNG_MAX = UGC_PICKUP_LNG_MAX;

/** @deprecated Use isWithinUgcPickupBounds */
export function isWithinUgcVeniceBounds(lat: number, lng: number): boolean {
  return isWithinUgcPickupBounds(lat, lng);
}

export const CreateListingSchema = z.object({
  title: z.string().trim().min(1).max(500),
  photoUrl: z.string().url(),
  photoUrls: z.array(z.string().url()).min(1).max(10).optional(),
  lat: z.number().min(UGC_PICKUP_LAT_MIN).max(UGC_PICKUP_LAT_MAX),
  lng: z.number().min(UGC_PICKUP_LNG_MIN).max(UGC_PICKUP_LNG_MAX),
  description: z.string().max(2000).optional(),
  postCategory: postCategoryEnum,
});

export function createListingSchemaForUser(userId: string) {
  const userPhotoUrl = z
    .string()
    .url()
    .refine((url) => url.includes(`/ugc-photos/${userId}/`), {
      message: 'Photo must be uploaded via /api/ugc/upload',
    });

  return CreateListingSchema.extend({
    photoUrl: userPhotoUrl,
    photoUrls: z.array(userPhotoUrl).min(1).max(10).optional(),
  });
}

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const ALLOWED_UPLOAD_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
