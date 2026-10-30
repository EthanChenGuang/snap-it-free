'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFeedFilterOptional } from '@/components/shell/FeedFilterContext';
import { useFeedScrollOptional } from '@/components/shell/FeedScrollContext';
import { useDistanceCenter } from '@/hooks/useDistanceCenter';
import { DEFAULT_FILTER_PREFS } from '@/lib/filter-prefs/storage';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { useMessages } from '@/lib/i18n/useMessages';
import { fetchActiveListingsClient } from '@/lib/listings/client-queries';
import { excludeReportedIds } from '@/lib/listings/filters';
import type { ListingRow } from '@/lib/listings/types';
import { lockedFeedHasActiveFilters, lockedTeaserForFilters } from '@/lib/paywall/locked-feed';
import type { PaywallTeaser } from '@/lib/paywall/locked-preview';
import { readReportedIds } from '@/lib/reports/storage';
import { getSupabaseEnv } from '@/lib/supabase/env';

/** Locked home teaser that follows search + filters using real rows, never fabricated counts. */
export function useLockedFeedTeaser(fallback: PaywallTeaser): { teaser: PaywallTeaser; filtered: boolean } {
  const { language, messages } = useMessages();
  const filters = useFeedFilterOptional();
  const scroll = useFeedScrollOptional();
  const applied = filters?.applied ?? DEFAULT_FILTER_PREFS;
  const searchQuery = scroll?.searchQuery ?? '';
  const mapModeActive = applied.mode === 'map' && applied.radiusEnabled;
  const { center } = useDistanceCenter(mapModeActive);
  const cityLabels = useMemo(() => consumerCityLabelsFromMessages(messages), [messages]);
  const [rows, setRows] = useState<ListingRow[] | null>(null);

  useEffect(() => {
    if (!getSupabaseEnv()) return;
    let cancelled = false;
    fetchActiveListingsClient().then(
      (all) => {
        if (cancelled) return;
        setRows(excludeReportedIds(all, readReportedIds()));
      },
      () => {
        if (!cancelled) setRows([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const teaser = useMemo(
    () =>
      lockedTeaserForFilters({
        rows: rows ?? [],
        fallback,
        applied,
        searchQuery,
        language,
        cityLabels,
        center: mapModeActive ? center : null,
      }),
    [rows, fallback, applied, searchQuery, language, cityLabels, mapModeActive, center],
  );

  return { teaser, filtered: lockedFeedHasActiveFilters(applied, searchQuery) };
}
