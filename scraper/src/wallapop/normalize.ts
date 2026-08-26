import { inferListingCategory } from '../../../lib/listings/categories.js';
import { computeScrapedListingExpiresAt as computeExpiresAt } from '../../../lib/listings/scraped-listing-ttl.js';
import { contentHash } from '../shared/dedupe.js';
import { CanonicalListingSchema, type CanonicalListing } from '../shared/schema.js';
import { loadZonePolygons, tagZone } from '../shared/zone-tag.js';
import type { RawListing } from '../subito/extract.js';
import { isFreePrice } from './filters.js';

export type NormalizeResult = CanonicalListing | { reject: string };

const zonePolygons = loadZonePolygons();

const INFERRED_CATEGORY_TO_SLUG = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  apparel: 'abbigliamento-accessori',
  books: 'libri-riviste',
  home_decor: 'arredamento-casalinghi',
} as const;

function resolveWallapopCategorySlug(raw: RawListing): string | null {
  const inferred = inferListingCategory(raw.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];
  return null;
}

/**
 * Normalize Wallapop €0 listing (D-25-02).
 * Requires HTTPS wallapop.com host and resolvable posted_at.
 */
export function normalizeWallapopRawListing(raw: RawListing): NormalizeResult {
  if (!isFreePrice(raw.price)) {
    return { reject: 'not_free' };
  }

  try {
    const parsedHost = new URL(raw.external_url);
    if (
      parsedHost.protocol !== 'https:' ||
      !/(^|\.)wallapop\.com$/i.test(parsedHost.hostname)
    ) {
      return { reject: 'invalid_external_host' };
    }
  } catch {
    return { reject: 'invalid_external_url' };
  }

  const postedAt = new Date(raw.posted_at);
  if (Number.isNaN(postedAt.getTime())) {
    return { reject: 'invalid_posted_at' };
  }

  const expiresAt = computeExpiresAt(postedAt);
  const zone = raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng, zonePolygons) : null;
  const category = resolveWallapopCategorySlug(raw);

  const candidate = {
    source: 'wallapop' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone,
    city: raw.city ?? null,
    region: null,
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '',
    category,
    raw_payload: { description: raw.description },
  };

  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}
