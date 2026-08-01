import { z } from 'zod';

export const CreateListingSchema = z.object({
  title: z.string().trim().min(1).max(500),
  photoUrl: z.string().url(),
  lat: z.number().min(45.0).max(45.7),
  lng: z.number().min(12.1).max(12.6),
  description: z.string().max(2000).optional(),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const ALLOWED_UPLOAD_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
