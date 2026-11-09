import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTER_PREFS } from '@/lib/filter-prefs/storage';
import type { ListingRow } from '@/lib/listings/types';
import { lockedFeedHasActiveFilters, lockedTeaserForFilters } from './locked-feed';

const cityLabels = {
  venice: 'Venice',
  padova: 'Padova',
  milano: 'Milan',
  firenze: 'Florence',
  roma: 'Rome',
  napoli: 'Naples',
  perugia: 'Perugia',
  torino: 'Turin',
  prato: 'Prato',
  bologna: 'Bologna',
  brescia: 'Brescia',
  genova: 'Genoa',
  verona: 'Verona',
};

const row = (overrides: Partial<ListingRow> & Pick<ListingRow, 'id'>): ListingRow => ({
  source: 'subito',
  title: `Title ${overrides.id}`,
  photo_url: `https://img/${overrides.id}.jpg`,
  external_url: 'https://subito.it/annunci/1',
  lat: 45.44,
  lng: 12.33,
  zone: 'centro_storico',
  city: 'venezia',
  category: 'libri-riviste',
  posted_at: '2026-10-25T10:00:00.000Z',
  expires_at: '2026-10-27T10:00:00.000Z',
  status: 'active',
  ...overrides,
});

const books = row({
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Free bookshelf',
  category: 'libri-riviste',
  photo_url: 'https://img/bookshelf.jpg',
});
const sofa = row({
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Free sofa',
  category: 'arredamento-casalinghi',
  photo_url: 'https://img/sofa.jpg',
});
const milanLamp = row({
  id: '33333333-3333-3333-3333-333333333333',
  title: 'Lamp in Milan',
  city: 'milano',
  zone: null,
  lat: 45.46,
  lng: 9.19,
  category: 'arredamento-casalinghi',
  photo_url: 'https://img/lamp.jpg',
});

const fallback = { count: 355, photoUrls: ['https://img/ssr.jpg'] };

describe('lockedFeedHasActiveFilters', () => {
  it('is false for the default prefs and an empty search', () => {
    expect(lockedFeedHasActiveFilters(DEFAULT_FILTER_PREFS, '')).toBe(false);
  });

  it('is true for search, city, category or radius', () => {
    expect(lockedFeedHasActiveFilters(DEFAULT_FILTER_PREFS, 'sofa')).toBe(true);
    expect(lockedFeedHasActiveFilters({ ...DEFAULT_FILTER_PREFS, city: 'venice' }, '')).toBe(true);
    expect(lockedFeedHasActiveFilters({ ...DEFAULT_FILTER_PREFS, categories: ['libri-riviste'] }, '')).toBe(true);
    expect(lockedFeedHasActiveFilters({ ...DEFAULT_FILTER_PREFS, mode: 'map', radiusEnabled: true }, '')).toBe(true);
  });
});

describe('lockedTeaserForFilters', () => {
  const base = {
    fallback,
    language: 'en' as const,
    cityLabels,
    center: null,
  };

  it('keeps the SSR teaser when there are no rows to filter (044 / empty env)', () => {
    expect(
      lockedTeaserForFilters({
        ...base,
        rows: [],
        applied: { ...DEFAULT_FILTER_PREFS, city: 'venice' },
        searchQuery: 'sofa',
      }),
    ).toEqual(fallback);
  });

  it('unfiltered keeps the SSR total and uses row photos', () => {
    const teaser = lockedTeaserForFilters({
      ...base,
      rows: [books, sofa],
      applied: DEFAULT_FILTER_PREFS,
      searchQuery: '',
    });
    expect(teaser.count).toBe(355);
    expect(teaser.photoUrls).toEqual(['https://img/bookshelf.jpg', 'https://img/sofa.jpg']);
  });

  it('search changes the count and the blurred photos from real rows', () => {
    const teaser = lockedTeaserForFilters({
      ...base,
      rows: [books, sofa],
      applied: DEFAULT_FILTER_PREFS,
      searchQuery: 'sofa',
    });
    expect(teaser).toEqual({ count: 1, photoUrls: ['https://img/sofa.jpg'] });
  });

  it('city filter uses the real city match, never a fake count', () => {
    const teaser = lockedTeaserForFilters({
      ...base,
      rows: [books, milanLamp],
      applied: { ...DEFAULT_FILTER_PREFS, city: 'milano' },
      searchQuery: '',
    });
    expect(teaser).toEqual({ count: 1, photoUrls: ['https://img/lamp.jpg'] });
  });

  it('category filter uses the onboarding interest slugs', () => {
    const teaser = lockedTeaserForFilters({
      ...base,
      rows: [books, sofa],
      applied: { ...DEFAULT_FILTER_PREFS, categories: ['libri-riviste'] },
      searchQuery: '',
    });
    expect(teaser.count).toBe(1);
    expect(teaser.photoUrls).toEqual(['https://img/bookshelf.jpg']);
  });

  it('a search with no matches is honestly zero, not the SSR total', () => {
    const teaser = lockedTeaserForFilters({
      ...base,
      rows: [books, sofa],
      applied: DEFAULT_FILTER_PREFS,
      searchQuery: 'zzzz-no-such-item',
    });
    expect(teaser).toEqual({ count: 0, photoUrls: [] });
  });

  it('the teaser never carries titles, ids or listing links', () => {
    const teaser = lockedTeaserForFilters({
      ...base,
      rows: [books],
      applied: DEFAULT_FILTER_PREFS,
      searchQuery: '',
    });
    expect(Object.keys(teaser).sort()).toEqual(['count', 'photoUrls']);
    expect(teaser).toEqual({ count: 355, photoUrls: ['https://img/bookshelf.jpg'] });
    expect(JSON.stringify(teaser)).not.toMatch(/Free bookshelf|11111111-1111-1111-1111-111111111111|subito\.it/);
  });
});
