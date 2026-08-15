import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export class GraphqlParseError extends Error {
  constructor(
    message: string,
    public readonly reason: 'missing_api_data' | 'empty_listings' | 'parse_error',
  ) {
    super(message);
    this.name = 'GraphqlParseError';
  }
}

export type FacebookCardListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  price_amount: string;
  price_formatted: string | null;
  location_label: string;
  category_id: string | null;
  delivery_types: string[];
  source_category_url: string;
};

export type ParseGraphqlResult = {
  listings: FacebookCardListing[];
  jsonFieldCompleteness: number;
};

type GraphqlListingNode = Record<string, unknown>;

function parseJsonBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new GraphqlParseError('Malformed GraphQL JSON', 'parse_error');
  }
}

function getFeedEdges(root: unknown): unknown[] {
  if (root == null || typeof root !== 'object') {
    throw new GraphqlParseError('Invalid GraphQL root', 'parse_error');
  }
  const data = ((root as { data?: unknown }).data ?? root) as Record<string, unknown>;
  const search = data.marketplace_search as Record<string, unknown> | undefined;
  const feedUnits =
    (search?.feed_units as Record<string, unknown> | undefined) ??
    (data.viewer as Record<string, unknown> | undefined)?.marketplace_feed_units;
  const edges = (feedUnits as { edges?: unknown[] } | undefined)?.edges;
  if (!Array.isArray(edges) || edges.length === 0) {
    throw new GraphqlParseError('GraphQL feed_units edges empty/missing', 'empty_listings');
  }
  return edges;
}

export function mapFacebookCard(
  node: GraphqlListingNode,
  sourceCategoryUrl: string,
): FacebookCardListing | null {
  const external_id = node.id != null ? String(node.id) : '';
  const title = String(node.marketplace_listing_title ?? node.custom_title ?? '').trim();
  const listingPrice = node.listing_price as
    | { amount?: string; formatted_amount?: string }
    | undefined;
  const price_amount = listingPrice?.amount ?? '';
  const price_formatted = listingPrice?.formatted_amount ?? null;
  const photo_url =
    (node.primary_listing_photo as { image?: { uri?: string } } | undefined)?.image?.uri ?? '';
  const location_label =
    (node.location as { reverse_geocode?: { city?: string } } | undefined)?.reverse_geocode
      ?.city ?? '';
  const category_id =
    node.marketplace_listing_category_id != null
      ? String(node.marketplace_listing_category_id)
      : null;
  const delivery_types = Array.isArray(node.delivery_types)
    ? (node.delivery_types as string[])
    : [];

  if (!external_id || !title || !photo_url) return null;

  return {
    external_id,
    title: title.slice(0, 500),
    photo_url,
    external_url: `https://www.facebook.com/marketplace/item/${external_id}/`,
    price_amount,
    price_formatted,
    location_label,
    category_id,
    delivery_types,
    source_category_url: sourceCategoryUrl,
  };
}

export function fieldCompleteness(listings: FacebookCardListing[]): number {
  if (listings.length === 0) return 0;
  const requiredPerListing = 5;
  let filled = 0;
  for (const listing of listings) {
    if (listing.external_id) filled += 1;
    if (listing.title) filled += 1;
    if (listing.photo_url) filled += 1;
    if (listing.external_url) filled += 1;
    if (listing.price_amount !== '' || listing.price_formatted) filled += 1;
  }
  return filled / (listings.length * requiredPerListing);
}

export function parseGraphqlSearchResponse(
  rawBody: string,
  sourceCategoryUrl: string,
): ParseGraphqlResult {
  const root = parseJsonBody(rawBody);
  const edges = getFeedEdges(root);
  const listings: FacebookCardListing[] = [];

  for (const edge of edges) {
    const node = (edge as { node?: { listing?: GraphqlListingNode } }).node?.listing;
    if (!node) continue;
    const mapped = mapFacebookCard(node, sourceCategoryUrl);
    if (mapped) listings.push(mapped);
  }

  if (listings.length === 0) {
    throw new GraphqlParseError('No mappable listings in GraphQL response', 'empty_listings');
  }

  return {
    listings,
    jsonFieldCompleteness: fieldCompleteness(listings),
  };
}

/** Parse a captured POST /api/graphql/ response body (may be wrapped or raw data node). */
export function extractListingsFromGraphqlBody(
  json: unknown,
  sourceCategoryUrl: string,
): FacebookCardListing[] {
  return parseGraphqlSearchResponse(JSON.stringify(json), sourceCategoryUrl).listings;
}

export function loadFixtureSearchGraphql(
  fixtureName = 'facebook-search-graphql-sample.json',
): string {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../fixtures',
    fixtureName,
  );
  return readFileSync(fixturePath, 'utf-8');
}

export function loadFixtureDetailFragment(
  fixtureName = 'facebook-item-detail-fragment.json',
): string {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../fixtures',
    fixtureName,
  );
  return readFileSync(fixturePath, 'utf-8');
}
