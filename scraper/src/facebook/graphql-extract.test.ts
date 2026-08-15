import { describe, expect, it } from 'vitest';
import {
  GraphqlParseError,
  loadFixtureSearchGraphql,
  mapFacebookCard,
  parseGraphqlSearchResponse,
} from './graphql-extract.js';

const SOURCE_URL =
  'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend';

describe('parseGraphqlSearchResponse (SCRP-E01)', () => {
  it('parses facebook-search-graphql-sample.json → ≥1 listing with external_id, title, photo_url', () => {
    const raw = loadFixtureSearchGraphql();
    const { listings, jsonFieldCompleteness } = parseGraphqlSearchResponse(raw, SOURCE_URL);

    expect(listings.length).toBeGreaterThanOrEqual(1);
    expect(jsonFieldCompleteness).toBeGreaterThanOrEqual(0.9);

    const first = listings[0];
    expect(first.external_id).toBe('9876543210123456');
    expect(first.title).toBe('Sedia ufficio gratis Venezia');
    expect(first.photo_url).toContain('fbcdn.net');
    expect(first.external_url).toBe(
      'https://www.facebook.com/marketplace/item/9876543210123456/',
    );
    expect(first.location_label).toBe('Venice');
    expect(first.source_category_url).toBe(SOURCE_URL);
  });

  it('throws GraphqlParseError when feed edges are missing/empty', () => {
    expect(() => parseGraphqlSearchResponse('{}', SOURCE_URL)).toThrow(GraphqlParseError);
    expect(() =>
      parseGraphqlSearchResponse(
        JSON.stringify({ data: { marketplace_search: { feed_units: { edges: [] } } } }),
        SOURCE_URL,
      ),
    ).toThrow(GraphqlParseError);
  });
});

describe('mapFacebookCard', () => {
  it('returns null when required fields are missing', () => {
    expect(mapFacebookCard({}, SOURCE_URL)).toBeNull();
  });
});
