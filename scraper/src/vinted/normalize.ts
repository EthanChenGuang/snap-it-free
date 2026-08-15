import { inferListingCategory } from '../../../lib/listings/categories.js';
import { computeScrapedListingExpiresAt as computeExpiresAt } from '../../../lib/listings/scraped-listing-ttl.js';
import { mapVintedCatalogToSlug } from '../../../lib/listings/vinted-category-map.js';
import { contentHash } from '../shared/dedupe.js';
import { CanonicalListingSchema, type CanonicalListing } from '../shared/schema.js';
import { loadZonePolygons, tagZone } from '../shared/zone-tag.js';
import type { RawListing } from '../subito/extract.js';
import { isFreePrice } from './filters.js';

export type NormalizeResult = CanonicalListing | { reject: string };

const zonePolygons = loadZonePolygons();

/** Keep in sync with INFERRED_CATEGORY_TO_SLUG in lib/listings/canonical-categories.ts */
const INFERRED_CATEGORY_TO_SLUG = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  apparel: 'abbigliamento-accessori',
  books: 'libri-riviste',
  home_decor: 'arredamento-casalinghi',
} as const;

function parseCatalogIdFromDescription(description?: string): number | null {
  if (!description?.startsWith('catalog_id:')) return null;
  const id = Number(description.slice('catalog_id:'.length));
  return Number.isFinite(id) ? id : null;
}

function resolveVintedCategorySlug(raw: RawListing): string | null {
  const catalogId = raw.catalog_id ?? parseCatalogIdFromDescription(raw.description);
  const fromMap = mapVintedCatalogToSlug(catalogId);
  if (fromMap) return fromMap;
  const inferred = inferListingCategory(raw.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];
  return null;
}

/**
 * Normalize a Vinted raw listing to a canonical listing for persist.
 *
 * Rejection gates (Phase 17):
 * - D-17-04: non-free items rejected at extract/normalize layer (reason `not_free`).
 * - D-17-02: missing/ambiguous price never qualifies.
 * - D-17-01: only €0 price qualifies as free.
 * - T-17-04: external_url must be a vinted.it HTTPS host before persist.
 * - D-17-11 / D-17-07: CanonicalListingSchema superRefine enforces city bbox when
 *   coords present and requires coords (or resolvable city) to persist.
 */
export function normalizeVintedRawListing(raw: RawListing): NormalizeResult {
  if (!isFreePrice(raw.price)) {
    return { reject: 'not_free' };
  }
  try {
    const parsedHost = new URL(raw.external_url);
    if (parsedHost.protocol !== 'https:' || !/^([^/]*\.)?vinted\.it$/i.test(parsedHost.hostname)) {
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
  const category = resolveVintedCategorySlug(raw);

  const candidate = {
    source: 'vinted' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone,
    city: null,
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
