import { contentHash } from './dedupe.js';
import { isMislabeledFree } from './free-filter.js';
import { CanonicalListingSchema, type CanonicalListing } from './schema.js';
import { loadZonePolygons, tagZone } from './zone-tag.js';
import type { RawListing } from '../subito/extract.js';
import { extractCategoryFromSubitoUrl } from '../subito/normalize.js';
import { parseRegaloCategoryUrl } from '../subito/url-context.js';

export type NormalizeResult = CanonicalListing | { reject: string };

const zonePolygons = loadZonePolygons();

export function normalizeRawListing(raw: RawListing): NormalizeResult {
  const rejectReason = isMislabeledFree(raw.title, raw.description);
  if (rejectReason) return { reject: rejectReason };

  const postedAt = new Date(raw.posted_at);
  const expiresAt = new Date(postedAt.getTime() + 48 * 60 * 60 * 1000);

  const zone =
    raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng, zonePolygons) : null;

  const urlContext = raw.source_category_url
    ? parseRegaloCategoryUrl(raw.source_category_url)
    : null;

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone,
    city: urlContext?.city ?? null,
    region: urlContext?.region ?? null,
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '',
    category: extractCategoryFromSubitoUrl(raw.external_url),
    raw_payload: {
      description: raw.description,
    },
  };

  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}
