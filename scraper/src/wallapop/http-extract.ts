import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawListing } from '../subito/extract.js';
import { WALLAPOP_ITEM_ORIGIN } from './search-api.js';

export class WallapopParseError extends Error {
  constructor(
    message: string,
    public readonly reason: 'missing_api_data' | 'empty_listings' | 'parse_error' | 'blocked',
  ) {
    super(message);
    this.name = 'WallapopParseError';
  }
}

export type WallapopSearchListing = RawListing & {
  price: string;
  image_urls: string[];
};

export type ParseWallapopSearchResult = {
  listings: WallapopSearchListing[];
  jsonFieldCompleteness: number;
};

type WallapopLocation = {
  latitude?: number;
  longitude?: number;
  city?: string;
};

type WallapopImage = {
  urls?: { medium?: string; small?: string; big?: string };
};

type WallapopSearchObject = {
  id?: string | number;
  title?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  web_slug?: string;
  slug?: string;
  image?: string;
  images?: WallapopImage[];
  location?: WallapopLocation;
  creation_date?: number;
  created_at?: string;
};

function parsePrice(amount: number | string | undefined): string {
  if (amount == null || amount === '') return '';
  return String(amount);
}

function resolvePhotoUrl(item: WallapopSearchObject): string {
  if (item.image) return item.image;
  const first = item.images?.[0];
  return first?.urls?.medium ?? first?.urls?.big ?? first?.urls?.small ?? '';
}

function resolvePostedAt(item: WallapopSearchObject): string {
  if (item.created_at) {
    const d = new Date(item.created_at);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof item.creation_date === 'number' && item.creation_date > 0) {
    const ms = item.creation_date > 1_000_000_000_000 ? item.creation_date : item.creation_date * 1000;
    return new Date(ms).toISOString();
  }
  return '';
}

export function mapSearchObject(
  item: WallapopSearchObject,
  sourceCategoryUrl: string,
): WallapopSearchListing | null {
  const external_id = item.id != null ? String(item.id) : '';
  const title = item.title?.trim() ?? '';
  const slug = item.web_slug ?? item.slug ?? '';
  const external_url = slug ? `${WALLAPOP_ITEM_ORIGIN}/item/${slug}` : '';
  const photo_url = resolvePhotoUrl(item);
  const price = parsePrice(item.price);
  const lat = item.location?.latitude ?? null;
  const lng = item.location?.longitude ?? null;
  const posted_at = resolvePostedAt(item);

  if (!external_id || !title || !photo_url || !external_url) {
    return null;
  }

  const image_urls = (item.images ?? [])
    .map((img) => img.urls?.medium ?? img.urls?.big ?? img.urls?.small)
    .filter((url): url is string => Boolean(url));
  if (image_urls.length === 0 && photo_url) {
    image_urls.push(photo_url);
  }

  return {
    source: 'wallapop',
    external_id,
    title: title.slice(0, 500),
    photo_url,
    external_url,
    lat,
    lng,
    posted_at,
    price,
    description: item.description?.trim() || undefined,
    image_urls,
    source_category_url: sourceCategoryUrl || undefined,
    city: item.location?.city ?? null,
  };
}

function fieldCompleteness(listings: WallapopSearchListing[]): number {
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

export function parseWallapopSearchResponse(
  rawBody: string,
  sourceCategoryUrl: string,
): ParseWallapopSearchResult {
  let root: unknown;
  try {
    root = JSON.parse(rawBody);
  } catch {
    throw new WallapopParseError('Malformed Wallapop search JSON', 'parse_error');
  }

  if (typeof rawBody === 'string' && /<!DOCTYPE|<HTML/i.test(rawBody.slice(0, 200))) {
    throw new WallapopParseError('Wallapop returned HTML (blocked)', 'blocked');
  }

  const objects = (root as { search_objects?: unknown }).search_objects;
  if (!Array.isArray(objects)) {
    throw new WallapopParseError('search_objects missing', 'missing_api_data');
  }

  const listings: WallapopSearchListing[] = [];
  for (const item of objects as WallapopSearchObject[]) {
    const mapped = mapSearchObject(item, sourceCategoryUrl);
    if (mapped) listings.push(mapped);
  }

  if (listings.length === 0) {
    throw new WallapopParseError('No mappable listings in search response', 'empty_listings');
  }

  return {
    listings,
    jsonFieldCompleteness: fieldCompleteness(listings),
  };
}

export function loadFixtureSearch(fixtureName = 'wallapop-search-api-sample.json'): string {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../fixtures',
    fixtureName,
  );
  return readFileSync(fixturePath, 'utf-8');
}
