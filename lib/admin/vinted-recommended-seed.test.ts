import { describe, expect, it } from 'vitest';
import {
  buildDefaultVintedUrl,
  RECOMMENDED_VINTED_SEED_COUNT,
  RECOMMENDED_VINTED_SEED_URLS,
  VINTED_SEED_CITY_SLUGS,
} from './vinted-recommended-seed';
import { SUBITO_REGALO_CATALOG } from './subito-regalo-catalog';

const VINTED_CATALOG_URL_REGEX = /^https:\/\/www\.vinted\.it\/catalog\/\d+/;

describe('vinted-recommended-seed (D-17-05, D-17-19)', () => {
  it('exports 34 seed URLs (17 slugs × 2 cities)', () => {
    expect(RECOMMENDED_VINTED_SEED_COUNT).toBe(34);
    expect(RECOMMENDED_VINTED_SEED_URLS).toHaveLength(34);
    expect(RECOMMENDED_VINTED_SEED_COUNT).toBe(
      SUBITO_REGALO_CATALOG.length * VINTED_SEED_CITY_SLUGS.length,
    );
  });

  it('every URL matches vinted.it catalog path template', () => {
    for (const url of RECOMMENDED_VINTED_SEED_URLS) {
      expect(url).toMatch(VINTED_CATALOG_URL_REGEX);
    }
  });

  it('buildDefaultVintedUrl attaches city intent query param (D-17-06/10)', () => {
    const url = buildDefaultVintedUrl('informatica', 'venezia');
    expect(url).toContain('catalog/3584-accessori-per-computer');
    expect(url).toContain('order=newest_first');
    expect(url).toContain('city=venezia');
  });
});
