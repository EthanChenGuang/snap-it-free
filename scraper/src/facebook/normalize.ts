import { computeScrapedListingExpiresAt as computeExpiresAt } from '../../../lib/listings/scraped-listing-ttl.js';
import { contentHash } from '../shared/dedupe.js';
import { CanonicalListingSchema, type CanonicalListing } from '../shared/schema.js';
import { loadZonePolygons, tagZone } from '../shared/zone-tag.js';
import type { RawListing } from '../subito/extract.js';
import { rejectReasonIfNotFacebookFree } from './filters.js';
import type { NormalizeResult } from '../shared/normalize.js';

const zonePolygons = loadZonePolygons();

/** Canonical marketplace item URL (D-18-35). */
export function facebookExternalUrl(externalId: string): string {
  return `https://www.facebook.com/marketplace/item/${externalId}/`;
}

function isFacebookHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /(^|\.)facebook\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Normalize a Facebook raw listing for persist.
 *
 * - D-18-01/02/03: price-field-only free gate via rejectReasonIfNotFacebookFree
 * - D-18-35: canonical facebook.com marketplace item URL
 * - D-18-36: scraped TTL via computeScrapedListingExpiresAt
 */
export function normalizeFacebookRawListing(raw: RawListing): NormalizeResult {
  const reject = rejectReasonIfNotFacebookFree(raw.price, raw.price_formatted);
  if (reject) return { reject };

  const externalUrl = facebookExternalUrl(raw.external_id);
  if (!isFacebookHost(externalUrl)) {
    return { reject: 'invalid_external_host' };
  }

  const postedAt = new Date(raw.posted_at);
  if (Number.isNaN(postedAt.getTime())) {
    return { reject: 'invalid_posted_at' };
  }

  const expiresAt = computeExpiresAt(postedAt);
  const zone =
    raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng, zonePolygons) : null;

  const candidate = {
    source: 'facebook' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: externalUrl,
    lat: raw.lat,
    lng: raw.lng,
    zone,
    city: raw.city ?? null,
    region: raw.region ?? null,
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '',
    category: null,
    raw_payload: {
      description: raw.description,
      price_formatted: raw.price_formatted ?? null,
      source_category_url: raw.source_category_url ?? null,
    },
  };

  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}
