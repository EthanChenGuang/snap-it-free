import { z } from 'zod';
import {
  PADOVA_LAT_MAX,
  PADOVA_LAT_MIN,
  PADOVA_LNG_MAX,
  PADOVA_LNG_MIN,
} from '../subito/extract.js';

export const ListingSource = z.enum(['subito', 'facebook', 'ugc']);
export const VeniceZone = z.enum(['centro_storico', 'mestre_marghera', 'lido_murano']);

const VENICE_LAT_MIN = 45.0;
const VENICE_LAT_MAX = 45.7;
const VENICE_LNG_MIN = 12.1;
const VENICE_LNG_MAX = 12.6;

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
    category: z.string().nullable().optional(),
    raw_payload: z.record(z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.lat == null || data.lng == null) return;

    const city = data.city?.toLowerCase();
    if (city === 'padova') {
      if (
        data.lat < PADOVA_LAT_MIN ||
        data.lat > PADOVA_LAT_MAX ||
        data.lng < PADOVA_LNG_MIN ||
        data.lng > PADOVA_LNG_MAX
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Coordinates outside Padova bounding box',
          path: ['lat'],
        });
      }
      return;
    }

    if (
      data.lat < VENICE_LAT_MIN ||
      data.lat > VENICE_LAT_MAX ||
      data.lng < VENICE_LNG_MIN ||
      data.lng > VENICE_LNG_MAX
    ) {
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
