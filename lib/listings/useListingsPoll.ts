'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchActiveListingsClient } from './client-queries';
import type { ListingRow } from './types';

const DEFAULT_POLL_INTERVAL_MS = 300_000;

export function useListingsPoll(
  initialListings: ListingRow[],
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
) {
  const [listings, setListings] = useState(initialListings);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await fetchActiveListingsClient();
      setListings(next);
    } catch {
      // Keep last good snapshot on transient fetch errors
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setListings(initialListings);
  }, [initialListings]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, refresh]);

  return { listings, refresh, isRefreshing };
}
