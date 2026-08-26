export const WALLAPOP_API_SEARCH = 'https://api.wallapop.com/api/v3/general/search';
export const WALLAPOP_ITEM_ORIGIN = 'https://it.wallapop.com';

const DEFAULT_LAT = '45.4408';
const DEFAULT_LNG = '12.3155';
const DEFAULT_DISTANCE_KM = '15';
const DEFAULT_MAX_SALE_PRICE = '0';
const DEFAULT_ORDER_BY = 'newest';

/**
 * Map admin seed URL → Wallapop search API with €0 ceiling (D-25-02).
 * Reads lat/lng, distance, order, keywords, and time_filter from the seed when present.
 */
export function searchSeedUrlToApiUrl(seedUrl: string): string {
  const u = new URL(seedUrl);
  const params = new URLSearchParams();
  params.set('filters_source', 'search_box');
  params.set('latitude', u.searchParams.get('latitude') ?? DEFAULT_LAT);
  params.set('longitude', u.searchParams.get('longitude') ?? DEFAULT_LNG);
  params.set('distance_in_km', u.searchParams.get('distance_in_km') ?? DEFAULT_DISTANCE_KM);
  params.set('max_sale_price', u.searchParams.get('max_sale_price') ?? DEFAULT_MAX_SALE_PRICE);
  params.set('order_by', u.searchParams.get('order_by') ?? DEFAULT_ORDER_BY);
  const keywords = u.searchParams.get('keywords')?.trim();
  if (keywords) {
    params.set('keywords', keywords);
  }
  const timeFilter = u.searchParams.get('time_filter')?.trim();
  if (timeFilter) {
    params.set('time_filter', timeFilter);
  }
  return `${WALLAPOP_API_SEARCH}?${params.toString()}`;
}
