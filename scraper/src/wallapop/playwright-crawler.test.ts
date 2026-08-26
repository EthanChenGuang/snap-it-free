import { describe, expect, it } from 'vitest';
import { loadFixtureSearch } from './http-extract.js';
import { runWallapopFixtureCrawler } from './playwright-crawler.js';
import { buildWallapopSearchUrl } from '../../../lib/admin/wallapop-search-catalog.js';

const SEED_URL =
  'https://it.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155';

describe('runWallapopFixtureCrawler', () => {
  it('parses fixture API bodies per city seed URL', async () => {
    const body = loadFixtureSearch();
    const result = await runWallapopFixtureCrawler(
      [SEED_URL],
      new Map([[SEED_URL, body]]),
      { earlyStopK: 5, isFullRefresh: true },
    );

    expect(result.httpRequests).toBe(1);
    expect(result.rawListings.length).toBeGreaterThan(0);
    expect(result.jsonFieldCompleteness).toBeGreaterThanOrEqual(0.9);
    expect(result.blockedUrlCount).toBe(0);
  });

  it('marks URL blocked when fixture missing', async () => {
    const result = await runWallapopFixtureCrawler([SEED_URL], new Map(), {});
    expect(result.rawListings).toHaveLength(0);
    expect(result.blockedUrlCount).toBe(1);
  });
});

describe('wallapop seed URLs', () => {
  it('catalog builder matches scraper seed shape', () => {
    const url = buildWallapopSearchUrl('venezia');
    expect(url).toContain('max_sale_price=0');
    expect(url).toContain('distance_in_km=15');
    expect(url).toContain('city=venezia');
  });
});
