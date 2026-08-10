import { describe, expect, it } from 'vitest';
import {
  composeFeedListings,
  resolveDistanceCenter,
  VENICE_DEFAULT_CENTER,
} from './useDistanceCenter';
import type { ListingRow } from '@/lib/listings/types';
import { DEFAULT_FILTER_PREFS } from '@/lib/filter-prefs/storage';

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

describe('resolveDistanceCenter', () => {
  it('returns browse center when saved (priority over GPS)', () => {
    const browse = { lat: 45.5, lng: 12.4, label: 'Custom pin' };
    const gps = { lat: 45.41, lng: 11.88 };
    const result = resolveDistanceCenter(browse, gps);
    expect(result.center).toEqual({ lat: 45.5, lng: 12.4 });
    expect(result.centerSource).toBe('browse');
  });

  it('falls back to GPS when no browse center', () => {
    const gps = { lat: 45.41, lng: 11.88 };
    const result = resolveDistanceCenter(null, gps);
    expect(result.center).toEqual(gps);
    expect(result.centerSource).toBe('gps');
  });

  it('falls back to Venice default when GPS unavailable', () => {
    const result = resolveDistanceCenter(null, null);
    expect(result.center).toEqual(VENICE_DEFAULT_CENTER);
    expect(result.centerSource).toBe('default');
  });
});

const cityLabels = { venice: 'Venice', padova: 'Padova' };

describe('composeFeedListings pipeline', () => {
  const center = VENICE_DEFAULT_CENTER;

  it('excludes listing with null lat when radius ON', () => {
    const noCoord: ListingRow = {
      ...baseListing,
      id: '22222222-2222-2222-2222-222222222222',
      lat: null,
      lng: null,
    };
    const applied = { ...DEFAULT_FILTER_PREFS, radiusEnabled: true, radiusKm: 50 };
    const { listings } = composeFeedListings({
      listings: [baseListing, noCoord],
      applied,
      center,
      searchQuery: '',
      language: 'en',
      cityLabels,
    });
    expect(listings).toHaveLength(1);
    expect(listings[0]?.id).toBe(baseListing.id);
  });

  it('includes no-coord listing when radius OFF', () => {
    const noCoord: ListingRow = {
      ...baseListing,
      id: '22222222-2222-2222-2222-222222222222',
      lat: null,
      lng: null,
    };
    const applied = { ...DEFAULT_FILTER_PREFS, radiusEnabled: false };
    const { listings } = composeFeedListings({
      listings: [baseListing, noCoord],
      applied,
      center,
      searchQuery: '',
      language: 'en',
      cityLabels,
    });
    expect(listings).toHaveLength(2);
  });

  it('sorts by distance when center is active', () => {
    const near: ListingRow = {
      ...baseListing,
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      lat: 45.441,
      lng: 12.331,
    };
    const far: ListingRow = {
      ...baseListing,
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      lat: 45.5,
      lng: 12.5,
    };
    const applied = { ...DEFAULT_FILTER_PREFS, radiusEnabled: false };
    const { listings } = composeFeedListings({
      listings: [far, near],
      applied,
      center,
      searchQuery: '',
      language: 'en',
      cityLabels,
    });
    expect(listings[0]?.id).toBe(near.id);
    expect(listings[1]?.id).toBe(far.id);
  });

  it('sorts by posted_at desc when no center', () => {
    const older: ListingRow = {
      ...baseListing,
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      posted_at: '2026-07-20T10:00:00.000Z',
    };
    const newer: ListingRow = {
      ...baseListing,
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      posted_at: '2026-07-28T10:00:00.000Z',
    };
    const applied = { ...DEFAULT_FILTER_PREFS, radiusEnabled: false };
    const { listings } = composeFeedListings({
      listings: [older, newer],
      applied,
      center: null,
      searchQuery: '',
      language: 'en',
      cityLabels,
    });
    expect(listings[0]?.id).toBe(newer.id);
  });

  it('matchesAnySubitoCategories OR filters correctly', () => {
    const furniture: ListingRow = {
      ...baseListing,
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      category: 'arredamento-casalinghi',
    };
    const electronics: ListingRow = {
      ...baseListing,
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      category: 'informatica',
    };
    const applied = {
      ...DEFAULT_FILTER_PREFS,
      categories: ['arredamento-casalinghi', 'informatica'],
    };
    const { listings } = composeFeedListings({
      listings: [furniture, electronics],
      applied,
      center: null,
      searchQuery: '',
      language: 'en',
      cityLabels,
    });
    expect(listings).toHaveLength(2);
  });
});
