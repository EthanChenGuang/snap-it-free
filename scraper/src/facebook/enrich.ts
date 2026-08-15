import { getCityBySubitoSlug, inCityBbox, type SubitoCitySlug } from '../geo/italian-cities.js';
import { lookupMunicipalityCentroid } from '../subito/extract.js';
import type { RawListing } from '../subito/extract.js';
import type { FacebookCardListing } from './graphql-extract.js';
import { loadFixtureDetailFragment } from './graphql-extract.js';

/** Pickup-capable delivery_types from Wave 0 spike (D-18-04, D-17-15 parity). */
export const LOCAL_PICKUP_DELIVERY_TYPES = new Set([
  'IN_PERSON',
  'MEETUP',
  'MEET_UP',
  'LOCAL_PICKUP',
  'PICKUP',
]);

const SHIPPING_ONLY_DELIVERY_TYPES = new Set(['SHIPPING', 'SHIPPING_ON_SITE']);

export type FacebookDetailFields = {
  delivery_types: string[];
  pickup_location: string | null;
  category_id: string | null;
  price_amount: string | null;
  price_formatted: string | null;
};

export type EnrichRejectReason =
  | 'shipping_only'
  | 'city_intent_mismatch'
  | 'missing_delivery_types'
  | 'out_of_bbox';

export type EnrichResult =
  | { ok: true; listing: RawListing }
  | { ok: false; reason: EnrichRejectReason };

/**
 * Reject shipping-only listings; require meet-up/pickup signal (D-18-04).
 */
export function isFacebookLocalPickup(
  deliveryTypes: string[] | null | undefined,
): boolean {
  if (!deliveryTypes || deliveryTypes.length === 0) return false;

  const normalized = deliveryTypes.map((value) => value.toUpperCase());
  const hasPickup = normalized.some((value) => LOCAL_PICKUP_DELIVERY_TYPES.has(value));
  if (!hasPickup) return false;

  const shippingOnly = normalized.every((value) => SHIPPING_ONLY_DELIVERY_TYPES.has(value));
  return !shippingOnly;
}

/** Extract Venice/Padova intent from FB marketplace search URL path (D-18-25). */
export function parseCityIntentFromFacebookUrl(searchUrl: string): SubitoCitySlug | null {
  try {
    const match = new URL(searchUrl).pathname.match(/\/marketplace\/([^/]+)\//i);
    if (!match?.[1]) return null;

    const slug = match[1].toLowerCase();
    if (slug === 'venice') return 'venezia';
    if (slug === 'padova') return 'padova';
    return getCityBySubitoSlug(slug) ? (slug as SubitoCitySlug) : null;
  } catch {
    return null;
  }
}

export function parseFacebookDetailFragment(json: unknown): FacebookDetailFields {
  const root = json as Record<string, unknown>;
  const delivery_types = Array.isArray(root.delivery_types)
    ? (root.delivery_types as string[])
    : [];
  const pickupInfo = root.pickup_info as { location_text?: string } | undefined;
  const listingPrice = root.listing_price as
    | { amount?: string; formatted_amount?: string }
    | undefined;

  return {
    delivery_types,
    pickup_location:
      typeof pickupInfo?.location_text === 'string' ? pickupInfo.location_text : null,
    category_id:
      root.marketplace_listing_category_id != null
        ? String(root.marketplace_listing_category_id)
        : null,
    price_amount: listingPrice?.amount ?? null,
    price_formatted: listingPrice?.formatted_amount ?? null,
  };
}

/** Prefer pickup location over search-card city label (D-18-26). */
export function resolveFacebookLocation(
  card: FacebookCardListing,
  detail?: FacebookDetailFields,
): string | null {
  return detail?.pickup_location ?? card.location_label ?? null;
}

export function matchesFacebookCityIntent(
  locationText: string | null | undefined,
  expectedCity: SubitoCitySlug | null,
): boolean {
  if (!expectedCity) return true;
  if (!locationText?.trim()) return false;

  const cityDef = getCityBySubitoSlug(expectedCity);
  if (!cityDef) return false;

  const normalized = locationText.toLowerCase();
  if (normalized.includes(cityDef.subitoSlug)) return true;
  if (normalized.includes(cityDef.labelIt.toLowerCase())) return true;
  if (expectedCity === 'venezia' && normalized.includes('venice')) return true;

  const centroid = lookupMunicipalityCentroid(locationText);
  if (centroid && inCityBbox(centroid.lat, centroid.lng, expectedCity)) return true;

  return false;
}

function resolveCoordsFromLocation(
  locationText: string | null,
  sourceCategoryUrl: string,
): { lat: number | null; lng: number | null; city: SubitoCitySlug | null } {
  const cityIntent = parseCityIntentFromFacebookUrl(sourceCategoryUrl);
  const centroid = locationText ? lookupMunicipalityCentroid(locationText) : null;
  if (!centroid) {
    return { lat: null, lng: null, city: cityIntent };
  }

  const bboxCity = cityIntent ?? 'venezia';
  if (!inCityBbox(centroid.lat, centroid.lng, bboxCity)) {
    return { lat: null, lng: null, city: cityIntent };
  }

  return { lat: centroid.lat, lng: centroid.lng, city: bboxCity };
}

export function cardNeedsDetailVisit(card: FacebookCardListing): boolean {
  const missingPrice = !card.price_amount && !card.price_formatted;
  const missingLocation = !card.location_label?.trim();
  const missingCategory = !card.category_id;
  const missingPickupSignal = !isFacebookLocalPickup(card.delivery_types);
  return missingPrice || missingLocation || missingCategory || missingPickupSignal;
}

export function enrichFacebookCard(
  card: FacebookCardListing,
  postedAt: string,
  detail?: FacebookDetailFields,
): EnrichResult {
  const deliveryTypes = detail?.delivery_types ?? card.delivery_types;
  if (!isFacebookLocalPickup(deliveryTypes)) {
    return { ok: false, reason: 'shipping_only' };
  }

  const cityIntent = parseCityIntentFromFacebookUrl(card.source_category_url);
  const locationText = resolveFacebookLocation(card, detail);
  if (!matchesFacebookCityIntent(locationText, cityIntent)) {
    return { ok: false, reason: 'city_intent_mismatch' };
  }

  const { lat, lng, city } = resolveCoordsFromLocation(locationText, card.source_category_url);
  const cityDef = city ? getCityBySubitoSlug(city) : null;

  return {
    ok: true,
    listing: {
      source: 'facebook',
      external_id: card.external_id,
      title: card.title,
      photo_url: card.photo_url,
      external_url: card.external_url,
      lat,
      lng,
      posted_at: postedAt,
      price: detail?.price_amount ?? card.price_amount,
      price_formatted: detail?.price_formatted ?? card.price_formatted,
      city: cityDef?.subitoSlug ?? city,
      region: cityDef?.region ?? null,
      source_category_url: card.source_category_url,
      facebook_category_id: detail?.category_id ?? card.category_id,
    },
  };
}

/** Test helper — parse bundled detail fixture. */
export function loadFacebookDetailFixture(): FacebookDetailFields {
  const raw = loadFixtureDetailFragment();
  return parseFacebookDetailFragment(JSON.parse(raw));
}
