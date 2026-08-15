import { describe, expect, it } from 'vitest';
import {
  isLocalPickup,
  loadDetailFixture,
  matchesCityIntent,
  parseCityIntentFromUrl,
  parseItemDetail,
  parseSellerLocation,
  resolveSellerCity,
} from './enrich.js';

describe('parseItemDetail (D-17-15)', () => {
  it('extracts catalog_id and shipping.type from escaped RSC HTML', () => {
    const html = String.raw`self.__next_f.push([1,"{\"catalog_id\":3826,\"shipping\":{\"type\":\"shipping\"}}"])`;
    const result = parseItemDetail(html);
    expect(result.catalog_id).toBe(3826);
    expect(result.shipping_type).toBe('shipping');
  });

  it('loads fields from pinned detail fixture', () => {
    const result = loadDetailFixture();
    expect(result.catalog_id).toBe(3826);
    expect(result.shipping_type).toBe('shipping');
  });
});

describe('parseSellerLocation (D-17-07/13)', () => {
  it('prefers pickup city over profile city when both present', () => {
    const location = parseSellerLocation({
      data: {
        user: {
          city: 'Santa Maria Capua Vetere',
          pickup_location: { city: 'Mestre' },
          country_title: 'Italia',
        },
      },
    });
    expect(resolveSellerCity(location)).toBe('Mestre');
  });
});

describe('isLocalPickup (D-17-15)', () => {
  it('rejects shipping-only listings', () => {
    expect(isLocalPickup('shipping')).toBe(false);
  });

  it('accepts pickup and meet_up variants', () => {
    expect(isLocalPickup('pickup')).toBe(true);
    expect(isLocalPickup('meet_up')).toBe(true);
  });

  it('rejects missing shipping type', () => {
    expect(isLocalPickup(null)).toBe(false);
    expect(isLocalPickup(undefined)).toBe(false);
  });
});

describe('matchesCityIntent (D-17-10)', () => {
  it('parses city intent from catalog URL query param', () => {
    expect(
      parseCityIntentFromUrl(
        'https://www.vinted.it/catalog/1918-casa?order=newest_first&city=venezia',
      ),
    ).toBe('venezia');
  });

  it('accepts any seller city when URL has no city intent', () => {
    expect(matchesCityIntent('Milano', null)).toBe(true);
  });

  it('matches seller city against expected Venezia intent', () => {
    expect(matchesCityIntent('Mestre', 'venezia')).toBe(true);
    expect(matchesCityIntent('Milano', 'venezia')).toBe(false);
  });
});
