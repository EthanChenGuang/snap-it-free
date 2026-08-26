import { describe, expect, it } from 'vitest';
import {
  buildWallapopSearchUrl,
  generateWallapopSearchUrls,
  parseWallapopSearchUrl,
  RECOMMENDED_WALLAPOP_SEED_URLS,
  WALLAPOP_SEED_CITY_SLUGS,
} from './wallapop-search-catalog';

describe('wallapop-search-catalog', () => {
  it('builds search URL with €0 ceiling and 15km radius', () => {
    const url = buildWallapopSearchUrl('venezia');
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/search');
    expect(parsed.searchParams.get('max_sale_price')).toBe('0');
    expect(parsed.searchParams.get('distance_in_km')).toBe('15');
    expect(parsed.searchParams.get('city')).toBe('venezia');
    expect(parsed.searchParams.get('latitude')).toBeTruthy();
    expect(parsed.searchParams.get('longitude')).toBeTruthy();
  });

  it('generates one URL per selected city', () => {
    const urls = generateWallapopSearchUrls(['venezia', 'milano']);
    expect(urls).toHaveLength(2);
    expect(parseWallapopSearchUrl(urls[0]!)?.city).toBe('venezia');
    expect(parseWallapopSearchUrl(urls[1]!)?.city).toBe('milano');
  });

  it('recommended seed covers all 13 cities', () => {
    expect(RECOMMENDED_WALLAPOP_SEED_URLS).toHaveLength(WALLAPOP_SEED_CITY_SLUGS.length);
    for (const city of WALLAPOP_SEED_CITY_SLUGS) {
      const match = RECOMMENDED_WALLAPOP_SEED_URLS.some(
        (url) => parseWallapopSearchUrl(url)?.city === city,
      );
      expect(match).toBe(true);
    }
  });
});
