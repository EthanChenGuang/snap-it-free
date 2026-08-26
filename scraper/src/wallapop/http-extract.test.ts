import { describe, expect, it } from 'vitest';
import {
  loadFixtureSearch,
  parseWallapopSearchResponse,
} from './http-extract.js';

const SEED =
  'https://it.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155';

describe('parseWallapopSearchResponse', () => {
  it('maps search_objects to wallapop raw listings', () => {
    const { listings, jsonFieldCompleteness } = parseWallapopSearchResponse(
      loadFixtureSearch(),
      SEED,
    );
    expect(listings.length).toBe(3);
    expect(listings[0]?.source).toBe('wallapop');
    expect(listings[0]?.external_url).toContain('wallapop.com/item/');
    expect(listings[0]?.price).toBe('0');
    expect(jsonFieldCompleteness).toBeGreaterThan(0.9);
  });
});
