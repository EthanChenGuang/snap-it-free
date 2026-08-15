import { gotScraping } from 'got-scraping';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCityBySubitoSlug, inCityBbox, type SubitoCitySlug } from '../geo/italian-cities.js';
import { lookupMunicipalityCentroid } from '../subito/extract.js';
import type { RawListing } from '../subito/extract.js';
import type { VintedCatalogListing } from './http-extract.js';

const API_ORIGIN = 'https://www.vinted.it';
const USER_ENDPOINT = '/api/v2/users';
const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};
const REQUEST_TIMEOUT_MS = 20000;

/** Documented pickup-capable shipping.type values from Wave 0 spike (D-17-15). */
export const LOCAL_PICKUP_SHIPPING_TYPES = new Set([
  'pickup',
  'meet_up',
  'meetup',
  'handover',
  'in_person',
]);

export type ItemDetailFields = {
  catalog_id: number | null;
  shipping_type: string | null;
  posted_at_raw: string | null;
};

export type SellerLocation = {
  city: string | null;
  pickup_city: string | null;
  country_title: string | null;
};

export type EnrichRejectReason =
  | 'shipping_only'
  | 'city_intent_mismatch'
  | 'missing_shipping_type'
  | 'detail_fetch_failed';

export type EnrichResult =
  | { ok: true; listing: RawListing }
  | { ok: false; reason: EnrichRejectReason };

/**
 * Parse catalog_id, shipping.type, and optional posted_at from item-detail RSC HTML.
 * Wave 0 verified escaped-RSC regex path (17-SPIKE-VINTED-CATALOG.md).
 */
export function parseItemDetail(html: string): ItemDetailFields {
  const catalogIdMatch = html.match(/\\"catalog_id\\":(\d+)/);
  const shippingTypeMatch = html.match(/\\"shipping\\":\{\\"type\\":\\"([^\\"]+)\\"/);
  const postedAtMatch =
    html.match(/\\"created_at\\":\\"([^\\"]+)\\"/) ??
    html.match(/\\"created_at_ts\\":(\d+)/);

  let posted_at_raw: string | null = null;
  if (postedAtMatch) {
    posted_at_raw =
      postedAtMatch[1].match(/^\d+$/) != null
        ? new Date(Number(postedAtMatch[1]) * 1000).toISOString()
        : postedAtMatch[1];
  }

  return {
    catalog_id: catalogIdMatch ? Number(catalogIdMatch[1]) : null,
    shipping_type: shippingTypeMatch ? shippingTypeMatch[1] : null,
    posted_at_raw,
  };
}

/** Parse seller location from /api/v2/users/{id} JSON (D-17-07, D-17-13). */
export function parseSellerLocation(userJson: unknown): SellerLocation {
  if (userJson == null || typeof userJson !== 'object') {
    return { city: null, pickup_city: null, country_title: null };
  }
  const root = userJson as Record<string, unknown>;
  const data = (root.data as Record<string, unknown> | undefined) ?? root;
  const user =
    (data.user as Record<string, unknown> | undefined) ??
    (typeof data === 'object' ? (data as Record<string, unknown>) : undefined);

  if (!user) {
    return { city: null, pickup_city: null, country_title: null };
  }

  const pickup =
    (user.pickup_location as Record<string, unknown> | undefined) ??
    (user.meetup_location as Record<string, unknown> | undefined);

  return {
    city: typeof user.city === 'string' ? user.city : null,
    pickup_city:
      typeof pickup?.city === 'string'
        ? pickup.city
        : typeof user.location_description === 'string'
          ? user.location_description
          : null,
    country_title: typeof user.country_title === 'string' ? user.country_title : null,
  };
}

/** Prefer pickup/meet-up city over seller profile city (D-17-13). */
export function resolveSellerCity(location: SellerLocation): string | null {
  return location.pickup_city ?? location.city;
}

/**
 * Reject shipping-only listings; accept fixture-documented pickup types (D-17-15).
 */
export function isLocalPickup(shippingType: string | null | undefined): boolean {
  if (!shippingType) return false;
  if (shippingType === 'shipping') return false;
  return LOCAL_PICKUP_SHIPPING_TYPES.has(shippingType.toLowerCase());
}

/** Extract expected city intent from admin URL `city=` query param (D-17-10). */
export function parseCityIntentFromUrl(catalogUrl: string): SubitoCitySlug | null {
  try {
    const city = new URL(catalogUrl).searchParams.get('city')?.toLowerCase();
    if (!city) return null;
    return getCityBySubitoSlug(city) ? (city as SubitoCitySlug) : null;
  } catch {
    return null;
  }
}

/**
 * Validate seller city against matrix city intent metadata (D-17-10).
 * When no intent is encoded on the URL, accept any seller city.
 */
export function matchesCityIntent(
  sellerCity: string | null | undefined,
  expectedCity: SubitoCitySlug | null,
): boolean {
  if (!expectedCity) return true;
  if (!sellerCity?.trim()) return false;

  const cityDef = getCityBySubitoSlug(expectedCity);
  if (!cityDef) return false;

  const normalized = sellerCity.toLowerCase();
  if (normalized.includes(cityDef.subitoSlug)) return true;
  if (normalized.includes(cityDef.labelIt.toLowerCase())) return true;

  const centroid = lookupMunicipalityCentroid(sellerCity);
  if (centroid && inCityBbox(centroid.lat, centroid.lng, expectedCity)) return true;

  return false;
}

function resolveCoordsFromCity(
  sellerCity: string | null,
  sourceCategoryUrl: string,
): { lat: number | null; lng: number | null } {
  const cityIntent = parseCityIntentFromUrl(sourceCategoryUrl);
  const centroid = sellerCity ? lookupMunicipalityCentroid(sellerCity) : null;
  if (!centroid) return { lat: null, lng: null };

  const bboxCity = cityIntent ?? 'venezia';
  if (!inCityBbox(centroid.lat, centroid.lng, bboxCity)) {
    return { lat: null, lng: null };
  }
  return { lat: centroid.lat, lng: centroid.lng };
}

export async function fetchSellerLocation(
  userId: string,
  cookieHeader: string,
  proxyUrl?: string,
): Promise<SellerLocation> {
  const res = await gotScraping({
    url: `${API_ORIGIN}${USER_ENDPOINT}/${userId}`,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: REQUEST_TIMEOUT_MS },
    headers: {
      accept: 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(proxyUrl ? { proxyUrl } : {}),
  });
  if (res.statusCode !== 200) {
    throw new Error(`user API HTTP ${res.statusCode}`);
  }
  const body = typeof res.body === 'string' ? res.body : res.body.toString();
  return parseSellerLocation(JSON.parse(body));
}

export async function fetchItemDetailHtml(
  itemUrl: string,
  cookieHeader: string,
  proxyUrl?: string,
): Promise<string> {
  const res = await gotScraping({
    url: itemUrl,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: REQUEST_TIMEOUT_MS },
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    ...(proxyUrl ? { proxyUrl } : {}),
  });
  if (res.statusCode !== 200) {
    throw new Error(`item detail HTTP ${res.statusCode}`);
  }
  return typeof res.body === 'string' ? res.body : res.body.toString();
}

/**
 * Enrich a free catalog listing with detail page + seller location (D-17-15/12/13).
 */
export async function enrichListingDetail(
  listing: VintedCatalogListing,
  options: {
    cookieHeader: string;
    proxyUrl?: string;
    scrapeRunTime?: Date;
  },
): Promise<EnrichResult> {
  const cityIntent = parseCityIntentFromUrl(listing.source_category_url ?? '');

  try {
    const detailHtml = await fetchItemDetailHtml(
      listing.external_url,
      options.cookieHeader,
      options.proxyUrl,
    );
    const detail = parseItemDetail(detailHtml);

    if (!detail.shipping_type) {
      return { ok: false, reason: 'missing_shipping_type' };
    }
    if (!isLocalPickup(detail.shipping_type)) {
      return { ok: false, reason: 'shipping_only' };
    }

    let sellerLocation: SellerLocation = {
      city: null,
      pickup_city: null,
      country_title: null,
    };
    if (listing.user_id) {
      sellerLocation = await fetchSellerLocation(
        listing.user_id,
        options.cookieHeader,
        options.proxyUrl,
      );
    }

    const sellerCity = resolveSellerCity(sellerLocation);
    if (!matchesCityIntent(sellerCity, cityIntent)) {
      return { ok: false, reason: 'city_intent_mismatch' };
    }

    const coords =
      listing.lat != null && listing.lng != null
        ? { lat: listing.lat, lng: listing.lng }
        : resolveCoordsFromCity(sellerCity, listing.source_category_url ?? '');

    const postedAt =
      detail.posted_at_raw ??
      options.scrapeRunTime?.toISOString() ??
      new Date().toISOString();

    const enriched: RawListing = {
      source: 'vinted',
      external_id: listing.external_id,
      title: listing.title,
      photo_url: listing.photo_url,
      external_url: listing.external_url,
      lat: coords.lat,
      lng: coords.lng,
      posted_at: postedAt,
      price: listing.price,
      image_urls: listing.image_urls,
      source_category_url: listing.source_category_url,
      catalog_id: detail.catalog_id,
      description: detail.catalog_id != null ? `catalog_id:${detail.catalog_id}` : undefined,
    };

    return { ok: true, listing: enriched };
  } catch {
    return { ok: false, reason: 'detail_fetch_failed' };
  }
}

export function loadDetailFixture(
  fixtureName = 'vinted-item-detail-fragment.json',
): ItemDetailFields {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../fixtures',
    fixtureName,
  );
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
    catalog_id?: number;
    shipping?: { type?: string };
    posted_at?: string;
  };
  return {
    catalog_id: raw.catalog_id ?? null,
    shipping_type: raw.shipping?.type ?? null,
    posted_at_raw: typeof raw.posted_at === 'string' && !raw.posted_at.includes('scrape run')
      ? raw.posted_at
      : null,
  };
}
