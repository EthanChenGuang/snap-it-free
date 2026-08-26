import { describe, expect, it } from 'vitest';
import {
  buildDefaultFacebookUrl,
  FACEBOOK_SEARCH_QUERIES,
  FACEBOOK_SEED_CITY_SLUGS,
  RECOMMENDED_FACEBOOK_SEED_URLS,
  RECOMMENDED_FACEBOOK_SEED_COUNT,
} from './facebook-recommended-seed';
import { CONSUMER_CITY_KEYS } from '@/lib/geo/italian-cities';

describe('facebook-recommended-seed (D-18-22/21)', () => {
  it('exports 39 URLs for 13 cities × gratis/regalo/free', () => {
    expect(RECOMMENDED_FACEBOOK_SEED_COUNT).toBe(39);
    expect(RECOMMENDED_FACEBOOK_SEED_URLS).toHaveLength(39);
    expect(RECOMMENDED_FACEBOOK_SEED_COUNT).toBe(
      CONSUMER_CITY_KEYS.length * FACEBOOK_SEARCH_QUERIES.length,
    );
  });

  it('includes all thirteen marketplace city slugs', () => {
    expect(FACEBOOK_SEED_CITY_SLUGS).toEqual(CONSUMER_CITY_KEYS);
    for (const city of FACEBOOK_SEED_CITY_SLUGS) {
      expect(RECOMMENDED_FACEBOOK_SEED_URLS.some((url) => url.includes(`/marketplace/${city}/`))).toBe(
        true,
      );
    }
  });

  it('includes all search queries with sortBy=creation_time_descend', () => {
    for (const query of FACEBOOK_SEARCH_QUERIES) {
      const match = RECOMMENDED_FACEBOOK_SEED_URLS.find((url) => url.includes(`query=${query}`));
      expect(match).toBeDefined();
      expect(match).toContain('sortBy=creation_time_descend');
    }
  });

  it('buildDefaultFacebookUrl matches seed shape', () => {
    const url = buildDefaultFacebookUrl('venice', 'gratis');
    expect(url).toBe(
      'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend',
    );
  });
});
