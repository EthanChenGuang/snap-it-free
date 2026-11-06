import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildListingMetadata, getSiteUrl } from './listing-metadata';
import type { ListingRow } from './types';

const site = { name: '零元', description: '威尼斯免费物品地图' };

function makeListing(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    source: 'subito',
    title: 'Divano in regalo',
    description: 'Divano tre posti, da ritirare a Mestre.',
    photo_url: 'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/a.jpg',
    external_url: 'https://www.subito.it/annunci/veneto/annuncio-1',
    lat: 45.49,
    lng: 12.24,
    zone: 'mestre_marghera',
    city: 'Venezia',
    posted_at: '2026-10-01T00:00:00Z',
    expires_at: '2027-04-01T00:00:00Z',
    status: 'active',
    ...overrides,
  };
}

describe('buildListingMetadata', () => {
  it('emits og title, description, url and image from the public row', () => {
    const meta = buildListingMetadata(makeListing(), site);
    expect(meta.title).toBe('Divano in regalo · 零元');
    expect(meta.openGraph).toMatchObject({
      title: 'Divano in regalo',
      description: 'Divano tre posti, da ritirare a Mestre.',
      url: '/listing/11111111-1111-4111-8111-111111111111',
      siteName: '零元',
      images: [
        {
          url: 'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/a.jpg',
          alt: 'Divano in regalo',
        },
      ],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('prefers the first UGC gallery photo', () => {
    const meta = buildListingMetadata(
      makeListing({
        source: 'ugc',
        photo_urls: ['https://cdn.example.org/first.jpg', 'https://cdn.example.org/2.jpg'],
      }),
      site,
    );
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://cdn.example.org/first.jpg', alt: 'Divano in regalo' },
    ]);
  });

  it('falls back to site description with city when the listing has none', () => {
    const meta = buildListingMetadata(makeListing({ description: null }), site);
    expect(meta.description).toBe('威尼斯免费物品地图 · Venezia');
  });

  it('truncates long descriptions and collapses whitespace', () => {
    const meta = buildListingMetadata(
      makeListing({ description: `riga uno\n\n${'x'.repeat(400)}` }),
      site,
    );
    const description = meta.description as string;
    expect(description.length).toBe(200);
    expect(description.startsWith('riga uno x')).toBe(true);
    expect(description.endsWith('…')).toBe(true);
  });

  it('drops non-absolute photo URLs and uses a summary card', () => {
    const meta = buildListingMetadata(makeListing({ photo_url: '' }), site);
    expect(meta.openGraph?.images).toEqual([]);
    expect(meta.twitter).toMatchObject({ card: 'summary' });
  });
});

describe('getSiteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses APP_URL when set', () => {
    vi.stubEnv('APP_URL', 'https://zerodollar-blond.vercel.app');
    expect(getSiteUrl()?.origin).toBe('https://zerodollar-blond.vercel.app');
  });

  it('falls back to the Vercel production host', () => {
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'zerodollar-blond.vercel.app');
    expect(getSiteUrl()?.origin).toBe('https://zerodollar-blond.vercel.app');
  });

  it('ignores invalid values', () => {
    vi.stubEnv('APP_URL', 'MY_APP_URL');
    expect(getSiteUrl()).toBeUndefined();
  });
});
