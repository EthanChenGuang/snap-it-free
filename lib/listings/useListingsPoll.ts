'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveListingsClient,
  fetchActiveListingsCountClient,
} from './client-queries';
import type { ListingRow } from './types';

const DEFAULT_POLL_INTERVAL_MS = 300_000;

export type UseListingsPollOptions = {
  intervalMs?: number;
  initialTotalCount?: number | null;
};

export function useListingsPoll(
  initialListings: ListingRow[],
  intervalMsOrOptions: number | UseListingsPollOptions = DEFAULT_POLL_INTERVAL_MS,
) {
  const intervalMs =
    typeof intervalMsOrOptions === 'number'
      ? intervalMsOrOptions
      : (intervalMsOrOptions.intervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  const initialTotalCount =
    typeof intervalMsOrOptions === 'number'
      ? null
      : (intervalMsOrOptions.initialTotalCount ?? null);

  const [listings, setListings] = useState(initialListings);
  const [totalCount, setTotalCount] = useState<number | null>(initialTotalCount);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [next, count] = await Promise.all([
        fetchActiveListingsClient(),
        fetchActiveListingsCountClient(),
      ]);
      setListings((prev) => (next.length > 0 || prev.length === 0 ? next : prev));
      setTotalCount(count);
    } catch {
      // Keep last good snapshot on transient fetch errors
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialListings.length > 0) {
      setListings(initialListings);
    }
  }, [initialListings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setTotalCount(initialTotalCount);
  }, [initialTotalCount]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, refresh]);

  return { listings, totalCount, refresh, isRefreshing };
}
