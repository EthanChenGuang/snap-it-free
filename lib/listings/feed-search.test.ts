import { describe, expect, it } from 'vitest';
import { matchesFeedSearch } from './feed-search';
import type { ListingRow, VeniceZone } from './types';

const baseListing: ListingRow = {
  id: '11111111-1111-1111-1111-111111111111',
  source: 'subito',
  title: 'Lampada gratis',
  photo_url: 'https://example.com/photo.jpg',
  external_url: 'https://subito.it/annunci/1',
  lat: 45.44,
  lng: 12.33,
  zone: 'centro_storico',
  posted_at: '2026-07-28T10:00:00.000Z',
  expires_at: '2026-07-30T10:00:00.000Z',
  status: 'active',
};

const zoneLabel = (zone: VeniceZone) => {
  const labels: Record<VeniceZone, string> = {
    centro_storico: 'Historic Center',
    mestre_marghera: 'Mestre',
    lido_murano: 'Lido',
  };
  return labels[zone];
};

describe('matchesFeedSearch', () => {
  it('returns true for any listing when query is empty', () => {
    expect(matchesFeedSearch(baseListing, '', 'it', zoneLabel)).toBe(true);
    expect(matchesFeedSearch(baseListing, '   ', 'it', zoneLabel)).toBe(true);
  });

  it('matches title substring with locale-aware resolveListingTitle', () => {
    const listing: ListingRow = {
      ...baseListing,
      title: 'Lampada gratis',
      title_en: 'Free lamp',
    };

    expect(matchesFeedSearch(listing, 'free lamp', 'en', zoneLabel)).toBe(true);
    expect(matchesFeedSearch(listing, 'lampada', 'it', zoneLabel)).toBe(true);
  });

  it('matches location label via zone or city', () => {
    expect(matchesFeedSearch(baseListing, 'historic', 'en', zoneLabel)).toBe(true);

    const padovaListing: ListingRow = {
      ...baseListing,
      zone: null,
      city: 'padova',
    };
    expect(matchesFeedSearch(padovaListing, 'padova', 'it', zoneLabel)).toBe(true);
  });

  it('matches description substring when description_zh is present', () => {
    const listing: ListingRow = {
      ...baseListing,
      description_zh: '九成新台灯，免费自取',
    };

    expect(matchesFeedSearch(listing, '台灯', 'zh', zoneLabel)).toBe(true);
  });

  it('returns false when query matches nothing', () => {
    expect(matchesFeedSearch(baseListing, 'xyznonexistent', 'it', zoneLabel)).toBe(false);
  });
});
