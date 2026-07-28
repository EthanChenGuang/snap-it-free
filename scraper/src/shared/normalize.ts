import { contentHash } from './dedupe.js';
import { isMislabeledFree } from './free-filter.js';
import { CanonicalListingSchema, type CanonicalListing } from './schema.js';
import type { RawListing } from '../subito/extract.js';

export type NormalizeResult = CanonicalListing | { reject: string };

export function normalizeRawListing(raw: RawListing): NormalizeResult {
  const rejectReason = isMislabeledFree(raw.title, raw.description);
  if (rejectReason) return { reject: rejectReason };

  const postedAt = new Date(raw.posted_at);
  const expiresAt = new Date(postedAt.getTime() + 48 * 60 * 60 * 1000);

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone: null as CanonicalListing['zone'],
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '',
    raw_payload: {
      description: raw.description,
    },
  };

  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}
