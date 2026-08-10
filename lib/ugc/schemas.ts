import { z } from 'zod';
import { POST_CATEGORIES, type PostCategory } from '@/lib/listings/canonical-categories';

const postCategoryEnum = z.enum(
  POST_CATEGORIES as [PostCategory, ...PostCategory[]],
);

export const CreateListingSchema = z.object({
  title: z.string().trim().min(1).max(500),
  photoUrl: z.string().url(),
  lat: z.number().min(45.0).max(45.7),
  lng: z.number().min(12.1).max(12.6),
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
