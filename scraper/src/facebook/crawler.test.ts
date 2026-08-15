import { describe, expect, it } from 'vitest';
import { crawlHashForListing } from '../subito/crawl-hash.js';
import { loadFixtureSearchGraphql } from './graphql-extract.js';
import { runFacebookCrawler } from './crawler.js';

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

describe('runFacebookCrawler (fixture E2E)', () => {
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

  it('applies early-stop with knownMap (SCRP-E02)', async () => {
    const fixture = loadFixtureSearchGraphql();
    const firstRun = await runFacebookCrawler(
      [VENICE_URL],
      'conservative',
      undefined,
      {
        session: SESSION,
        fixtureGraphqlBodies: new Map([[VENICE_URL, fixture]]),
      },
    );
    expect(firstRun.rawListings.length).toBeGreaterThanOrEqual(1);

    const listing = firstRun.rawListings[0]!;
    const knownMap = new Map([
      [
        listing.external_id,
        crawlHashForListing({
          title: listing.title,
          price: listing.price ?? '',
          photo_url: listing.photo_url,
          posted_at: '',
        }),
      ],
    ]);

    const secondRun = await runFacebookCrawler(
      [VENICE_URL],
      'conservative',
      undefined,
      {
        session: SESSION,
        fixtureGraphqlBodies: new Map([[VENICE_URL, fixture]]),
        knownMap,
        earlyStopK: 1,
        isFullRefresh: false,
      },
    );

    expect(secondRun.urlBreakdown[0]?.earlyStopTriggered).toBe(true);
    expect(secondRun.listingsSkippedAtCrawl).toBeGreaterThanOrEqual(1);
  });

  it('dedupes external_id across URLs in same run (D-18-31)', async () => {
    const fixture = loadFixtureSearchGraphql();
    const padovaUrl =
      'https://www.facebook.com/marketplace/padova/search/?query=gratis&sortBy=creation_time_descend';
    const result = await runFacebookCrawler(
      [VENICE_URL, padovaUrl],
      'conservative',
      undefined,
      {
        session: SESSION,
        fixtureGraphqlBodies: new Map([
          [VENICE_URL, fixture],
          [padovaUrl, fixture],
        ]),
      },
    );

    const ids = result.rawListings.map((listing) => listing.external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
