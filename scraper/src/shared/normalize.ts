import { contentHash } from './dedupe.js';
import { isMislabeledFree } from './free-filter.js';
import { CanonicalListingSchema, type CanonicalListing } from './schema.js';
import { loadZonePolygons, tagZone } from './zone-tag.js';
import { crawlHashForListing } from '../subito/crawl-hash.js';
import type { RawListing } from '../subito/extract.js';
import { extractCategoryFromSubitoUrl } from '../subito/normalize.js';
import { parseRegaloCategoryUrl } from '../subito/url-context.js';
import { normalizeSubitoPhotoUrl } from '../../../lib/listings/subito-photo-url.js';
import { computeScrapedListingExpiresAt as computeExpiresAt } from '../../../lib/listings/scraped-listing-ttl.js';

export type NormalizeResult = CanonicalListing | { reject: string };

export { computeExpiresAt };

const zonePolygons = loadZonePolygons();

export function normalizeRawListing(raw: RawListing): NormalizeResult {
  const rejectReason = isMislabeledFree(raw.title, raw.description);
  if (rejectReason) return { reject: rejectReason };

  const postedAt = new Date(raw.posted_at);
  const expiresAt = computeExpiresAt(postedAt);

  const zone =
    raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng, zonePolygons) : null;

  const urlContext = raw.source_category_url
    ? parseRegaloCategoryUrl(raw.source_category_url)
    : null;

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: normalizeSubitoPhotoUrl(raw.photo_url),
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
  candidate.crawl_content_hash = crawlHashForListing(raw);
  return CanonicalListingSchema.parse(candidate);
}
