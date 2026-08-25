import { describe, expect, it } from 'vitest';
import { crawlHashForListing } from './crawl-hash.js';
import {
  CategoryParseError,
  loadFixtureHtml,
  parseCategoryNextData,
} from './http-extract.js';

const SOURCE_URL =
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/';

describe('parseCategoryNextData', () => {
  it('extracts RawListing[] from fixture __NEXT_DATA__ without Playwright', () => {
    const html = loadFixtureHtml();
    const { listings, jsonFieldCompleteness } = parseCategoryNextData(html, SOURCE_URL);

    expect(listings.length).toBe(3);
    expect(jsonFieldCompleteness).toBeGreaterThan(0.9);

    const first = listings[0];
    expect(first.external_id).toBe('656979545');
    expect(first.title).toBe('mobiletto legno');
    expect(first.photo_url).toContain('1f42c45e-b720-48ea-bc45-6f4dca904710');
    expect(first.photo_url).toContain('rule=gallery-mobile-1x-auto');
    expect(first.external_url).toContain('656979545.htm');
    expect(first.posted_at).toMatch(/2026-08-11/);
    expect(first.price).toBe('0 €');
    expect(first.source_category_url).toBe(SOURCE_URL);
    expect(first.lat).not.toBeNull();
    expect(first.lng).not.toBeNull();
    expect(first.description).toBe('[redacted description]');
  });

  it('maps category JSON body to description', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          initialState: {
            items: {
              originalList: [
                {
                  subject: 'lampada da tavolo',
                  body: '  Lampada funzionante, ritiro in zona Mestre.  ',
                  date: '2026-08-11 12:00:00',
                  features: { '/price': { values: [{ value: '0 €' }] } },
                  images: [{ cdnBaseUrl: 'https://images.sbito.it/x.jpg' }],
                  urls: {
                    default: 'https://www.subito.it/arredamento-casalinghi/lampada-456.htm',
                  },
                  geo: { city: { value: 'Venezia', shortName: 'VE' } },
                },
              ],
            },
          },
        },
      },
    });
    const html = `<html><script id="__NEXT_DATA__">${payload}</script></html>`;
    const { listings } = parseCategoryNextData(html, SOURCE_URL);
    expect(listings[0]?.description).toBe('Lampada funzionante, ritiro in zona Mestre.');
  });

  it('omits description when body is missing or blank', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          initialState: {
            items: {
              originalList: [
                {
                  subject: 'sedia',
                  body: '   ',
                  date: '2026-08-11 12:00:00',
                  features: { '/price': { values: [{ value: '0 €' }] } },
                  images: [{ cdnBaseUrl: 'https://images.sbito.it/x.jpg' }],
                  urls: { default: 'https://www.subito.it/arredamento-casalinghi/sedia-789.htm' },
                  geo: { city: { value: 'Venezia', shortName: 'VE' } },
                },
              ],
            },
          },
        },
      },
    });
    const html = `<html><script id="__NEXT_DATA__">${payload}</script></html>`;
    const { listings } = parseCategoryNextData(html, SOURCE_URL);
    expect(listings[0]?.description).toBeUndefined();
  });

  it('preserves fixture JSON array order', () => {
    const html = loadFixtureHtml();
    const { listings } = parseCategoryNextData(html, SOURCE_URL);
    expect(listings.map((l) => l.external_id)).toEqual([
      '656979545',
      '656955180',
      '656851383',
    ]);
  });

  it('throws CategoryParseError when __NEXT_DATA__ is missing', () => {
    expect(() => parseCategoryNextData('<html><body>blocked</body></html>', SOURCE_URL)).toThrow(
      CategoryParseError,
    );
    try {
      parseCategoryNextData('<html></html>', SOURCE_URL);
    } catch (err) {
      expect(err).toBeInstanceOf(CategoryParseError);
      expect((err as CategoryParseError).reason).toBe('missing_next_data');
    }
  });

  it('throws when listing array is empty', () => {
    const emptyPayload = JSON.stringify({
      props: { pageProps: { initialState: { items: { originalList: [] } } } },
    });
    const html = `<html><script id="__NEXT_DATA__">${emptyPayload}</script></html>`;
    expect(() => parseCategoryNextData(html, SOURCE_URL)).toThrow(CategoryParseError);
  });

  it('defaults empty price to 0 € on regalo category URLs (D-15-12)', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          initialState: {
            items: {
              originalList: [
                {
                  subject: 'regalo divano',
                  date: '2026-08-11 12:00:00',
                  features: {},
                  images: [{ cdnBaseUrl: 'https://images.sbito.it/x.jpg' }],
                  urls: { default: 'https://www.subito.it/arredamento-casalinghi/divano-123.htm' },
                  geo: { city: { value: 'Venezia', shortName: 'VE' } },
                },
              ],
            },
          },
        },
      },
    });
    const html = `<html><script id="__NEXT_DATA__">${payload}</script></html>`;
    const { listings, jsonFieldCompleteness } = parseCategoryNextData(html, SOURCE_URL);
    expect(listings[0]?.price).toBe('0 €');
    expect(jsonFieldCompleteness).toBe(1);
  });

  it('falls back to city bbox center for non-Venice regalo URLs when geo has no centroid', () => {
    const milanoUrl =
      'https://www.subito.it/annunci-lombardia/regalo/informatica/milano/milano/';
    const payload = JSON.stringify({
      props: {
        pageProps: {
          initialState: {
            items: {
              originalList: [
                {
                  subject: 'monitor gratis',
                  date: '2026-08-11 12:00:00',
                  features: { '/price': { values: [{ value: '0 €' }] } },
                  images: [{ cdnBaseUrl: 'https://images.sbito.it/x.jpg' }],
                  urls: {
                    default: 'https://www.subito.it/informatica/monitor-milano-999.htm',
                  },
                  geo: { city: { value: 'Milano', shortName: 'MI' } },
                },
              ],
            },
          },
        },
      },
    });
    const html = `<html><script id="__NEXT_DATA__">${payload}</script></html>`;
    const { listings } = parseCategoryNextData(html, milanoUrl);
    expect(listings[0]?.lat).toBeCloseTo(45.45);
    expect(listings[0]?.lng).toBeCloseTo(9.15);
  });
});

describe('http-extract module surface', () => {
  it('does not import Playwright for parse path', async () => {
    const mod = await import('./http-extract.js');
    expect(mod.parseCategoryNextData).toBeTypeOf('function');
    expect(mod.parseCategoryHtml).toBe(mod.parseCategoryNextData);
  });
});

describe('fixture hash stability', () => {
  it('crawl hash is stable for first fixture listing', () => {
    const html = loadFixtureHtml();
    const { listings } = parseCategoryNextData(html, SOURCE_URL);
    const hash1 = crawlHashForListing(listings[0]);
    const hash2 = crawlHashForListing(listings[0]);
    expect(hash1).toBe(hash2);
  });
});
