import { describe, expect, it } from 'vitest';
import { loadFixtureSearchGraphql } from './graphql-extract.js';
import { runFacebookCrawler } from './crawler.js';
import { normalizeFacebookRawListing } from './normalize.js';

const VENICE_URL =
  'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend';

const SESSION = {
  cookies: [
    {
      name: 'c_user',
      value: '100012345678901',
      domain: '.facebook.com',
      path: '/',
    },
  ],
};

describe('runFacebookCrawler (fixture tracer E2E)', () => {
  it('returns ≥1 free listing from mocked GraphQL fixture without live network', async () => {
    const fixture = loadFixtureSearchGraphql();
    const result = await runFacebookCrawler(
      [VENICE_URL],
      'conservative',
      'http://user:pass@proxy.example:8080',
      {
        session: SESSION,
        fixtureGraphqlBodies: new Map([[VENICE_URL, fixture]]),
      },
    );

    expect(result.rawListings.length).toBeGreaterThanOrEqual(1);
    expect(result.rawListings[0]?.source).toBe('facebook');
    expect(result.rawListings[0]?.price).toBe('0');
    expect(result.jsonFieldCompleteness).toBeGreaterThanOrEqual(0.9);

    const normalized = normalizeFacebookRawListing(result.rawListings[0]!);
    expect('reject' in normalized).toBe(false);
  });

  it('skips paid listings at crawl gate', async () => {
    const fixture = loadFixtureSearchGraphql();
    const result = await runFacebookCrawler(
      [VENICE_URL],
      'conservative',
      undefined,
      {
        session: SESSION,
        fixtureGraphqlBodies: new Map([[VENICE_URL, fixture]]),
      },
    );

    expect(result.listingsSkippedAtCrawl).toBeGreaterThanOrEqual(1);
    expect(result.rawListings.every((l) => l.price === '0')).toBe(true);
  });
});
