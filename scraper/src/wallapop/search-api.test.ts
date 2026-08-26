import { describe, expect, it } from 'vitest';
import { searchSeedUrlToApiUrl } from './search-api.js';

describe('searchSeedUrlToApiUrl', () => {
  it('maps Venice seed URL to API with max_sale_price=0', () => {
    const api = searchSeedUrlToApiUrl(
      'https://www.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155',
    );
    const u = new URL(api);
    expect(u.hostname).toBe('api.wallapop.com');
    expect(u.searchParams.get('max_sale_price')).toBe('0');
    expect(u.searchParams.get('keywords')).toBe('gratis');
    expect(u.searchParams.get('latitude')).toBe('45.4408');
    expect(u.searchParams.get('distance_in_km')).toBe('15');
  });

  it('forwards time_filter and max_sale_price from seed', () => {
    const api = searchSeedUrlToApiUrl(
      'https://it.wallapop.com/search?max_sale_price=0&time_filter=today&latitude=45.4&longitude=12.3&order_by=closest',
    );
    const u = new URL(api);
    expect(u.searchParams.get('time_filter')).toBe('today');
    expect(u.searchParams.get('order_by')).toBe('closest');
    expect(u.searchParams.get('max_sale_price')).toBe('0');
  });
});
