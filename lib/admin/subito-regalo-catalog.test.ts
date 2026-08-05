import { describe, expect, it } from 'vitest';
import {
  SUBITO_REGALO_CATALOG,
  buildRegaloCategoryUrl,
  dedupeUrls,
  generateRegaloUrls,
} from './subito-regalo-catalog';

describe('buildRegaloCategoryUrl', () => {
  it('builds 34 unique URLs for 17 slugs × venezia+padova (D-06)', () => {
    const slugs = SUBITO_REGALO_CATALOG.map((e) => e.slug);
    expect(slugs).toHaveLength(17);
    const urls = generateRegaloUrls(['venezia', 'padova'], slugs);
    expect(urls).toHaveLength(34);
    expect(new Set(urls).size).toBe(34);
    expect(urls[0]).toBe(
      buildRegaloCategoryUrl('veneto', 'arredamento-casalinghi', 'venezia'),
    );
  });
});

describe('dedupeUrls', () => {
  it('removes duplicate URLs (D-06)', () => {
    const a = buildRegaloCategoryUrl('veneto', 'informatica', 'padova');
    const result = dedupeUrls([a, a, '  ', a]);
    expect(result).toEqual([a]);
  });
});
