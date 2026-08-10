'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBrowseCenter } from '@/lib/browse-center/context';
import type { BrowseCenter } from '@/lib/browse-center/storage';
import type { FilterPrefs } from '@/lib/filter-prefs/storage';
import { haversineKm } from '@/lib/geo/haversine';
import { matchesFeedSearch, type ConsumerCityLabels } from '@/lib/listings/feed-search';
import {
  filterByRadiusKm,
  matchesConsumerCity,
  sortByDistance,
  sortByPostedAtDesc,
} from '@/lib/listings/filters';
import { matchesAnySubitoCategories } from '@/lib/listings/subito-categories';
import type { ListingRow } from '@/lib/listings/types';
import type { AppLanguage } from '@/lib/settings/preferences';

export const VENICE_DEFAULT_CENTER = { lat: 45.44, lng: 12.33 };

export type DistanceCenterSource = 'browse' | 'gps' | 'default';

export type DistanceCenter = {
  lat: number;
  lng: number;
};

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10000 };

/** Center priority: browseCenter → gpsCenter → Venice default (D-04–09). */
export function resolveDistanceCenter(
  browseCenter: BrowseCenter | null,
  gpsCenter: DistanceCenter | null,
): { center: DistanceCenter; centerSource: DistanceCenterSource } {
  if (browseCenter) {
    return {
      center: { lat: browseCenter.lat, lng: browseCenter.lng },
      centerSource: 'browse',
    };
  }
  if (gpsCenter) {
    return { center: gpsCenter, centerSource: 'gps' };
  }
  return { center: VENICE_DEFAULT_CENTER, centerSource: 'default' };
};

type ComposeFeedListingsInput = {
  listings: ListingRow[];
  applied: FilterPrefs;
  center: DistanceCenter | null;
  searchQuery: string;
  language: AppLanguage;
  cityLabels: ConsumerCityLabels;
};

/** Client-side filter pipeline: search → radius → city → categories → sort (D-29). */
export function composeFeedListings({
  listings,
  applied,
  center,
  searchQuery,
  language,
  cityLabels,
}: ComposeFeedListingsInput): {
  listings: ListingRow[];
  distanceMap: Map<string, number>;
} {
  let rows = listings.filter((listing) =>
    matchesFeedSearch(listing, searchQuery, language, cityLabels),
  );

  if (applied.radiusEnabled && center) {
    rows = filterByRadiusKm(rows, center, applied.radiusKm);
  }

  rows = rows.filter((listing) => matchesConsumerCity(listing, applied.city));

  if (applied.categories.length > 0) {
    rows = rows.filter((listing) => matchesAnySubitoCategories(listing, applied.categories));
  }

  const distanceMap = new Map<string, number>();
  if (center) {
    for (const listing of rows) {
      if (listing.lat != null && listing.lng != null) {
        const km = haversineKm(center, { lat: listing.lat, lng: listing.lng });
        distanceMap.set(listing.id, km * 1000);
      }
    }
    rows = sortByDistance(rows, center);
  } else {
    rows = sortByPostedAtDesc(rows);
  }

  return { listings: rows, distanceMap };
}

/** One-shot GPS center resolution for haversine filtering (D-05–10). */
export function useDistanceCenter(radiusEnabled: boolean) {
  const browseCenter = useBrowseCenter();
  const [gpsCenter, setGpsCenter] = useState<DistanceCenter | null>(null);
  const gpsRequested = useRef(false);

  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setGpsCenter(null);
      },
      GEO_OPTIONS,
    );
  }, []);

  useEffect(() => {
    if (!browseCenter && !gpsRequested.current) {
      gpsRequested.current = true;
      requestGps();
    }
  }, [browseCenter, requestGps]);

  useEffect(() => {
    if (radiusEnabled && !browseCenter) {
      requestGps();
    }
  }, [radiusEnabled, browseCenter, requestGps]);

  const resolved = useMemo(
    () => resolveDistanceCenter(browseCenter, gpsCenter),
    [browseCenter, gpsCenter],
  );

  return {
    center: resolved.center,
    centerSource: resolved.centerSource,
    requestGps,
  };
}
