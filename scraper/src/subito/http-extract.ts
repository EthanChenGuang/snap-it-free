import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cityBboxCenter } from '../geo/italian-cities.js';
import {
  lookupMunicipalityCentroid,
  type RawListing,
} from './extract.js';
import { parseRegaloCategoryUrl } from './url-context.js';
import { normalizeSubitoPhotoUrl } from '../../../lib/listings/subito-photo-url.js';

const LISTING_ARRAY_PATH = ['props', 'pageProps', 'initialState', 'items', 'originalList'] as const;

export class CategoryParseError extends Error {
  constructor(
    message: string,
    public readonly reason: 'missing_next_data' | 'empty_listings' | 'parse_error',
  ) {
    super(message);
    this.name = 'CategoryParseError';
  }
}

export type CategoryJsonListing = RawListing & {
  price: string;
  image_urls: string[];
};

export type ParseCategoryResult = {
  listings: CategoryJsonListing[];
  jsonFieldCompleteness: number;
};

type SubitoAdItem = {
  subject?: string;
  body?: string;
  date?: string;
  features?: Record<string, { values?: Array<{ key?: string; value?: string }> }>;
  images?: Array<{ cdnBaseUrl?: string }>;
  urls?: { default?: string };
  geo?: {
    city?: { value?: string; shortName?: string };
    town?: { value?: string };
  };
};

function extractNextDataJson(html: string): unknown {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]?.trim()) {
    throw new CategoryParseError('Missing __NEXT_DATA__ script block', 'missing_next_data');
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    throw new CategoryParseError('Malformed __NEXT_DATA__ JSON', 'parse_error');
  }
}

function getListingArray(root: unknown): SubitoAdItem[] {
  if (root == null || typeof root !== 'object') {
    throw new CategoryParseError('Invalid __NEXT_DATA__ root', 'parse_error');
  }
  let node: unknown = root;
  for (const key of LISTING_ARRAY_PATH) {
    if (node == null || typeof node !== 'object' || !(key in (node as object))) {
      throw new CategoryParseError(
        `Listing array path missing at ${key}`,
        'empty_listings',
      );
    }
    node = (node as Record<string, unknown>)[key];
  }
  if (!Array.isArray(node) || node.length === 0) {
    throw new CategoryParseError('Category listing array empty', 'empty_listings');
  }
  return node as SubitoAdItem[];
}

function parseExternalId(url: string): string | null {
  const match = url.match(/-(\d+)\.htm(?:\?|$)/);
  return match?.[1] ?? null;
}

function extractPrice(features: SubitoAdItem['features']): string {
  const priceFeature = features?.['/price'];
  const values = priceFeature?.values;
  if (!values?.length) return '';
  const first = values[0];
  return String(first.value ?? first.key ?? '');
}

function parseSubitoPostedAt(dateStr: string): string {
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return dateStr;
  return new Date(parsed).toISOString();
}

function municipalityFromGeo(geo: SubitoAdItem['geo']): string {
  const city = geo?.city?.value ?? '';
  const province = geo?.city?.shortName ?? '';
  const town = geo?.town?.value ?? '';
  if (city && province) return `${city} (${province})`;
  return town || city;
}

function mapAdItem(item: SubitoAdItem, sourceCategoryUrl: string): CategoryJsonListing | null {
  const external_url = item.urls?.default ?? '';
  const external_id = parseExternalId(external_url);
  const title = item.subject?.trim() ?? '';
  const image_urls = (item.images ?? [])
    .map((img) => img.cdnBaseUrl)
    .filter((url): url is string => Boolean(url))
    .map(normalizeSubitoPhotoUrl);
  const photo_url = image_urls[0] ?? '';
  const posted_at = item.date ? parseSubitoPostedAt(item.date) : '';
  const description = item.body?.trim() || undefined;
  let price = extractPrice(item.features);
  if (!price && /\/regalo\//i.test(sourceCategoryUrl)) {
    price = '0 €';
  }

  if (!external_id || !title || !photo_url || !posted_at) {
    return null;
  }

  const municipalityText = municipalityFromGeo(item.geo);
  const centroid = lookupMunicipalityCentroid(municipalityText);

  let lat = centroid?.lat ?? null;
  let lng = centroid?.lng ?? null;
  if (lat == null && lng == null && sourceCategoryUrl) {
    const urlContext = parseRegaloCategoryUrl(sourceCategoryUrl);
    if (urlContext?.city) {
      const center = cityBboxCenter(urlContext.city);
      lat = center.lat;
      lng = center.lng;
    }
  }

  return {
    external_id,
    title: title.slice(0, 500),
    photo_url,
    external_url,
    lat,
    lng,
    posted_at,
    price,
    image_urls,
    source_category_url: sourceCategoryUrl || undefined,
    ...(description ? { description } : {}),
  };
}

function fieldCompleteness(listings: CategoryJsonListing[]): number {
  if (listings.length === 0) return 0;
  const requiredPerListing = 5;
  let filled = 0;
  for (const listing of listings) {
    if (listing.external_id) filled += 1;
    if (listing.title) filled += 1;
    if (listing.photo_url) filled += 1;
    if (listing.posted_at) filled += 1;
    if (listing.price !== undefined && listing.price !== '') filled += 1;
  }
  return filled / (listings.length * requiredPerListing);
}

export function parseCategoryNextData(
  html: string,
  sourceCategoryUrl: string,
): ParseCategoryResult {
  const root = extractNextDataJson(html);
  const rawItems = getListingArray(root);
  const listings: CategoryJsonListing[] = [];

  for (const item of rawItems) {
    const mapped = mapAdItem(item, sourceCategoryUrl);
    if (mapped) listings.push(mapped);
  }

  if (listings.length === 0) {
    throw new CategoryParseError('No mappable listings in category JSON', 'empty_listings');
  }

  return {
    listings,
    jsonFieldCompleteness: fieldCompleteness(listings),
  };
}

/** Alias for plan artifact naming. */
export const parseCategoryHtml = parseCategoryNextData;

export function loadFixtureHtml(
  fixtureName = 'subito-category-next-data-fragment.json',
): string {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../fixtures',
    fixtureName,
  );
  const json = readFileSync(fixturePath, 'utf-8');
  return `<!DOCTYPE html><html><head><script id="__NEXT_DATA__" type="application/json">${json}</script></head><body></body></html>`;
}
