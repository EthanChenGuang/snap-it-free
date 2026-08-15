import { z } from 'zod';

export const ListingSourceSchema = z.enum(['subito', 'facebook', 'ugc', 'vinted']);
export const VeniceZoneSchema = z.enum(['centro_storico', 'mestre_marghera', 'lido_murano']);

export const ListingReadSchema = z.object({
  id: z.string().uuid(),
  source: ListingSourceSchema,
  title: z.string().min(1).max(500),
  photo_url: z.string().url(),
  external_url: z.string().url(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  zone: VeniceZoneSchema.nullable(),
  posted_at: z.string(),
  expires_at: z.string(),
  status: z.enum(['active', 'claimed', 'expired', 'hidden']),
});

export type ListingRead = z.infer<typeof ListingReadSchema>;
