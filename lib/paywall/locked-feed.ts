import { composeFeedListings } from '@/hooks/useDistanceCenter';
import type { FilterPrefs } from '@/lib/filter-prefs/storage';
import type { ConsumerCityLabels } from '@/lib/listings/feed-search';
import type { ListingRow } from '@/lib/listings/types';
import type { AppLanguage } from '@/lib/settings/preferences';
import { teaserFromListings, type PaywallTeaser } from './locked-preview';

export type LockedTeaserFilterInput = {
  rows: readonly ListingRow[];
  fallback: PaywallTeaser;
  applied: FilterPrefs;
  searchQuery: string;
  language: AppLanguage;
  cityLabels: ConsumerCityLabels;
  center: { lat: number; lng: number } | null;
};

export function lockedFeedHasActiveFilters(applied: FilterPrefs, searchQuery: string): boolean {
  const hasSearch = searchQuery.trim().length > 0;
  const hasCity = applied.mode === 'city' && applied.city !== 'all';
  const hasCategory = applied.categories.length > 0;
  const hasRadius = applied.mode === 'map' && applied.radiusEnabled;
  return hasSearch || hasCity || hasCategory || hasRadius;
}

/**
 * Real teaser for the locked home feed. Search/filters only change count + photo URLs.
 * Empty rows (044 RLS, missing env) keep the SSR teaser — never a fabricated filtered count.
 */
export function lockedTeaserForFilters(input: LockedTeaserFilterInput): PaywallTeaser {
  if (input.rows.length === 0) return input.fallback;

  const { listings } = composeFeedListings({
    listings: [...input.rows],
    applied: input.applied,
    center: input.center,
    searchQuery: input.searchQuery,
    language: input.language,
    cityLabels: input.cityLabels,
  });

  const filtered = teaserFromListings(listings, listings.length);
  if (!lockedFeedHasActiveFilters(input.applied, input.searchQuery)) {
    return {
      count: input.fallback.count ?? filtered.count,
      photoUrls: filtered.photoUrls.length > 0 ? filtered.photoUrls : input.fallback.photoUrls,
    };
  }
  return filtered;
}
