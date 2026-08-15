import { computeScrapedListingExpiresAt as computeExpiresAt } from '../../../lib/listings/scraped-listing-ttl.js';
import { resolveCanonicalCategorySlug } from '../../../lib/listings/canonical-categories.js';
import { getCityBySubitoSlug, inCityBbox } from '../geo/italian-cities.js';
import { contentHash } from '../shared/dedupe.js';
import { CanonicalListingSchema, type CanonicalListing } from '../shared/schema.js';
import { loadZonePolygons, tagZone } from '../shared/zone-tag.js';
import type { RawListing } from '../subito/extract.js';
import { crawlHashForListing } from '../subito/crawl-hash.js';
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

  if (raw.lat != null && raw.lng != null) {
    const citySlug = raw.city?.toLowerCase();
    const bboxCity =
      citySlug && getCityBySubitoSlug(citySlug) ? citySlug : 'venezia';
    if (!inCityBbox(raw.lat, raw.lng, bboxCity as Parameters<typeof inCityBbox>[2])) {
      return { reject: 'out_of_bbox' };
    }
  }

  const expiresAt = computeExpiresAt(postedAt);
  const zone =
    raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng, zonePolygons) : null;

  const facebookCategoryId = raw.facebook_category_id ?? null;
  const category = resolveCanonicalCategorySlug({
    source: 'facebook',
    title: raw.title,
    category: null,
    facebookCategoryId,
  });

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
    category,
    raw_payload: {
      description: raw.description,
      price_formatted: raw.price_formatted ?? null,
      source_category_url: raw.source_category_url ?? null,
      facebook_category_id: facebookCategoryId,
    },
  };

  candidate.content_hash = contentHash(candidate);
  candidate.crawl_content_hash = crawlHashForListing({
    title: raw.title,
    price: raw.price ?? '',
    photo_url: raw.photo_url,
    posted_at: '',
  });
  return CanonicalListingSchema.parse(candidate);
}
