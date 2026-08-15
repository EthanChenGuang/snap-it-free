import { z } from 'zod';
import { getCityBySubitoSlug, inCityBbox } from '../geo/italian-cities.js';

export const ListingSource = z.enum(['subito', 'facebook', 'ugc', 'vinted']);
export const VeniceZone = z.enum(['centro_storico', 'mestre_marghera', 'lido_murano']);

export const CanonicalListingSchema = z
  .object({
    source: ListingSource,
    external_id: z.string().min(1),
    title: z.string().min(1).max(500),
    photo_url: z.string().url(),
    external_url: z.string().url(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    zone: VeniceZone.nullable(),
    city: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    status: z.literal('active'),
    posted_at: z.coerce.date(),
    expires_at: z.coerce.date(),
    content_hash: z.string().length(64),
    crawl_content_hash: z.string().length(64).optional().nullable(),
    category: z.string().nullable().optional(),
    raw_payload: z.record(z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.lat == null || data.lng == null) return;

    const citySlug = data.city?.toLowerCase();
    if (citySlug && getCityBySubitoSlug(citySlug)) {
      if (!inCityBbox(data.lat, data.lng, citySlug as Parameters<typeof inCityBbox>[2])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Coordinates outside ${citySlug} bounding box`,
          path: ['lat'],
        });
      }
      return;
    }

    // Venice zone-tagged listings without explicit city still use Venice bbox.
    if (!inCityBbox(data.lat, data.lng, 'venezia')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Coordinates outside Venice bounding box',
        path: ['lat'],
      });
    }
  });

export type CanonicalListing = z.infer<typeof CanonicalListingSchema>;
export type ListingSourceType = z.infer<typeof ListingSource>;
export type VeniceZoneType = z.infer<typeof VeniceZone>;
