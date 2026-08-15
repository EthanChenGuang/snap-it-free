import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawListing } from '../subito/extract.js';

export class CategoryParseError extends Error {
  constructor(
    message: string,
    public readonly reason: 'missing_api_data' | 'empty_listings' | 'parse_error',
  ) {
    super(message);
    this.name = 'CategoryParseError';
  }
}

/**
 * A Vinted listing from the catalog API, tagged with the extra fields needed
 * for the free gate (price) and source routing (source: 'vinted').
 */
export type VintedCatalogListing = RawListing & {
  price: string;
  image_urls: string[];
  /** Vinted numeric item id. */
  external_id: string;
};

export type ParseCatalogResult = {
  listings: VintedCatalogListing[];
  jsonFieldCompleteness: number;
};

type VintedUser = { id?: number; login?: string };

type VintedCatalogItem = {
  id?: number;
  title?: string;
  price?: { amount?: string; currency_code?: string };
  url?: string;
  path?: string;
  photo?: { url?: string };
  photos?: Array<{ url?: string }>;
  user?: VintedUser;
  brand_title?: string;
  size_title?: string;
};

function parseCatalogResponseBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new CategoryParseError('Malformed catalog API JSON', 'parse_error');
  }
}

function getCatalogItems(root: unknown): VintedCatalogItem[] {
  if (root == null || typeof root !== 'object') {
    throw new CategoryParseError('Invalid catalog API root', 'parse_error');
  }
  const items = (root as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new CategoryParseError('Catalog API items array empty/missing', 'empty_listings');
  }
  return items as VintedCatalogItem[];
}

export function mapCatalogItem(
  item: VintedCatalogItem,
  sourceCategoryUrl: string,
): VintedCatalogListing | null {
  const external_id = item.id != null ? String(item.id) : '';
  const title = item.title?.trim() ?? '';
  const price = item.price?.amount ?? '';
  // `url` may be a PII-redacted placeholder in sanitized fixtures — treat it as
  // absent so the stable `path` field (which carries the item id) is used instead.
  const rawUrl = item.url?.trim() ?? '';
  const redacted = /^\[?redacted/i.test(rawUrl);
  const external_url =
    rawUrl && !redacted
      ? rawUrl
      : item.path
      ? `https://www.vinted.it${item.path}`
      : '';
  const photo_url = item.photo?.url ?? item.photos?.[0]?.url ?? '';
  const image_urls = (item.photos ?? [])
    .map((p) => p.url)
    .filter((url): url is string => Boolean(url));

  if (!external_id || !title || !photo_url || !external_url) {
    return null;
  }

  return {
    source: 'vinted',
    external_id,
    title: title.slice(0, 500),
    photo_url,
    external_url,
    lat: null,
    lng: null,
    posted_at: '',
    price,
    image_urls,
    source_category_url: sourceCategoryUrl || undefined,
  };
}

function fieldCompleteness(listings: VintedCatalogListing[]): number {
  if (listings.length === 0) return 0;
  const requiredPerListing = 5;
  let filled = 0;
  for (const listing of listings) {
    if (listing.external_id) filled += 1;
    if (listing.title) filled += 1;
    if (listing.photo_url) filled += 1;
    if (listing.external_url) filled += 1;
    if (listing.price !== undefined && listing.price !== '') filled += 1;
  }
  return filled / (listings.length * requiredPerListing);
}

/**
 * Parse a catalog API response body into typed listings using the Wave 0 spike
 * field map. Does not require network or Playwright (SCRP-E01 tracer).
 */
export function parseCatalogApiResponse(
  rawBody: string,
  sourceCategoryUrl: string,
): ParseCatalogResult {
  const root = parseCatalogResponseBody(rawBody);
  const items = getCatalogItems(root);
  const listings: VintedCatalogListing[] = [];

  for (const item of items) {
    const mapped = mapCatalogItem(item, sourceCategoryUrl);
    if (mapped) listings.push(mapped);
  }

  if (listings.length === 0) {
    throw new CategoryParseError('No mappable listings in catalog API response', 'empty_listings');
  }

  return {
    listings,
    jsonFieldCompleteness: fieldCompleteness(listings),
  };
}

export function loadFixtureCatalog(fixtureName = 'vinted-catalog-api-sample.json'): string {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../fixtures',
    fixtureName,
  );
  return readFileSync(fixturePath, 'utf-8');
}
