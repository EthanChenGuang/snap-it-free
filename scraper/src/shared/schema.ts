import { z } from 'zod';

export const ListingSource = z.enum(['subito', 'facebook', 'ugc']);
export const VeniceZone = z.enum(['centro_storico', 'mestre_marghera', 'lido_murano']);

export const CanonicalListingSchema = z.object({
  source: ListingSource,
  external_id: z.string().min(1),
  title: z.string().min(1).max(500),
  photo_url: z.string().url(),
  external_url: z.string().url(),
  lat: z.number().min(45.0).max(45.7).nullable(),
  lng: z.number().min(12.1).max(12.6).nullable(),
  zone: VeniceZone.nullable(),
  status: z.literal('active'),
  posted_at: z.coerce.date(),
  expires_at: z.coerce.date(),
  content_hash: z.string().length(64),
  category: z.string().nullable().optional(),
  raw_payload: z.record(z.unknown()).optional(),
});

export type CanonicalListing = z.infer<typeof CanonicalListingSchema>;
export type ListingSourceType = z.infer<typeof ListingSource>;
export type VeniceZoneType = z.infer<typeof VeniceZone>;
