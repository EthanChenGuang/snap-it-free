import { describe, expect, it } from 'vitest';
import {
  listingConsumerLocationLabel,
  matchesFeedSearch,
  type ConsumerCityLabels,
} from './feed-search';
import type { ListingRow } from './types';

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

const cityLabels: ConsumerCityLabels = {
  venice: 'Venice',
  padova: 'Padova',
  milano: 'Milan',
  firenze: 'Florence',
  roma: 'Rome',
  napoli: 'Naples',
  perugia: 'Perugia',
  torino: 'Turin',
  prato: 'Prato',
};

describe('matchesFeedSearch', () => {
  it('returns true for any listing when query is empty', () => {
    expect(matchesFeedSearch(baseListing, '', 'it', cityLabels)).toBe(true);
    expect(matchesFeedSearch(baseListing, '   ', 'it', cityLabels)).toBe(true);
  });

  it('matches title substring with locale-aware resolveListingTitle', () => {
    const listing: ListingRow = {
      ...baseListing,
      title: 'Lampada gratis',
      title_en: 'Free lamp',
    };

    expect(matchesFeedSearch(listing, 'free lamp', 'en', cityLabels)).toBe(true);
    expect(matchesFeedSearch(listing, 'lampada', 'it', cityLabels)).toBe(true);
  });

  it('finds Vinted listings by translated title fields (D-17-31)', () => {
    const listing: ListingRow = {
      ...baseListing,
      source: 'vinted',
      external_url: 'https://www.vinted.it/items/123456789',
      title: 'Lampada',
      title_en: 'Free lamp',
    };

    expect(matchesFeedSearch(listing, 'free lamp', 'en', cityLabels)).toBe(true);
    expect(matchesFeedSearch(listing, 'lampada', 'it', cityLabels)).toBe(true);
  });

  it('finds Facebook listings by title and translated title (D-18-47)', () => {
    const listing: ListingRow = {
      ...baseListing,
      source: 'facebook',
      external_url: 'https://www.facebook.com/marketplace/item/9876543210123456/',
      title: 'Regalo divano',
      title_en: 'Free sofa',
    };

    expect(matchesFeedSearch(listing, 'regalo divano', 'it', cityLabels)).toBe(true);
    expect(matchesFeedSearch(listing, 'free sofa', 'en', cityLabels)).toBe(true);
  });

  it('matches consumer city label for Venice zone listings', () => {
    expect(matchesFeedSearch(baseListing, 'venice', 'en', cityLabels)).toBe(true);

    const mestreListing: ListingRow = {
      ...baseListing,
      zone: 'mestre_marghera',
    };
    expect(matchesFeedSearch(mestreListing, 'venice', 'en', cityLabels)).toBe(true);
  });

  it('matches Padova city label', () => {
    const padovaListing: ListingRow = {
      ...baseListing,
      zone: null,
      city: 'padova',
    };
    expect(matchesFeedSearch(padovaListing, 'padova', 'it', cityLabels)).toBe(true);
  });

  it('does not match zone subdivision names', () => {
    expect(matchesFeedSearch(baseListing, 'historic center', 'en', cityLabels)).toBe(false);
    expect(matchesFeedSearch(baseListing, 'mestre', 'en', cityLabels)).toBe(false);
  });

  it('matches description substring when description_zh is present', () => {
    const listing: ListingRow = {
      ...baseListing,
      description_zh: '九成新台灯，免费自取',
    };

    expect(matchesFeedSearch(listing, '台灯', 'zh', cityLabels)).toBe(true);
  });

  it('returns false when query matches nothing', () => {
    expect(matchesFeedSearch(baseListing, 'xyznonexistent', 'it', cityLabels)).toBe(false);
  });
});

describe('listingConsumerLocationLabel', () => {
  it('maps Venice sub-zones to the city label', () => {
    expect(
      listingConsumerLocationLabel(
        { ...baseListing, zone: 'centro_storico' },
        cityLabels,
        'Approximate zone',
      ),
    ).toBe('Venice');

    expect(
      listingConsumerLocationLabel(
        { ...baseListing, zone: 'mestre_marghera' },
        cityLabels,
        'Approximate zone',
      ),
    ).toBe('Venice');
  });

  it('uses consumer city for non-Venice listings', () => {
    expect(
      listingConsumerLocationLabel(
        { ...baseListing, zone: null, city: 'padova' },
        cityLabels,
        'Approximate zone',
      ),
    ).toBe('Padova');
  });

  it('falls back to approximate zone label when city is unknown', () => {
    expect(
      listingConsumerLocationLabel(
        { ...baseListing, zone: null, city: null },
        cityLabels,
        'Approximate zone',
      ),
    ).toBe('Approximate zone');
  });
});
