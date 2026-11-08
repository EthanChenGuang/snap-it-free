'use client';

import { useEffect, useState } from 'react';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { dailyCountsFromMs, type CityMap, type DailyCount } from '@/lib/paywall/onboarding-stats';
import { cityTeaserFromSummary, type OnboardingSummary } from '@/lib/paywall/onboarding-summary';

export type TeaserPhoto = { key: string; url: string; alt: string };

export type CityTeaserState =
  | { status: 'loading' }
  | { status: 'ready'; count: number; photos: TeaserPhoto[] }
  | { status: 'error' };

export type RegionTeaserState =
  | { status: 'loading' }
  | {
      status: 'ready';
      venetoCount: number;
      venetoNew7d: number;
      collage: TeaserPhoto[];
      /** Weekly-volume screen: items posted per local day, last 7 days (Veneto). */
      daily: DailyCount[];
      newestMs: number | null;
      cityCount: number;
      /** Map screen: one bubble per city with its real active count (all cities, not just Veneto). */
      map: CityMap | null;
    }
  | { status: 'error' };

/**
 * Live figures come from /api/onboarding/summary (server-aggregated, CDN-cached) instead of every phone
 * downloading ~40k rows (Guang, 2026-11-08: the weekly screen waited ~5 s). The last summary is kept in
 * localStorage so a returning visitor sees figures at once while a fresh copy loads; a copy older than
 * MAX_CACHED_AGE_MS is not shown. Counts no longer subtract items this browser reported (a handful at most).
 */
const CACHE_KEY = 'zerodollar_onboarding_summary_v1';
const MAX_CACHED_AGE_MS = 6 * 60 * 60 * 1000;

type SummaryState = { status: 'loading' } | { status: 'ready'; summary: OnboardingSummary } | { status: 'error' };

function readCached(): OnboardingSummary | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const summary = JSON.parse(raw) as OnboardingSummary;
    return Date.now() - summary.generatedAt < MAX_CACHED_AGE_MS ? summary : null;
  } catch {
    return null;
  }
}

// One request per page load, shared by every hook instance; started as soon as this module loads.
let summaryPromise: Promise<OnboardingSummary> | null = null;
function summaryOnce(): Promise<OnboardingSummary> {
  summaryPromise ??= fetch('/api/onboarding/summary').then(async (res) => {
    if (!res.ok) throw new Error(`summary ${res.status}`);
    const summary = (await res.json()) as OnboardingSummary;
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
    } catch {
      // Private mode / quota: just no cache next time.
    }
    return summary;
  });
  return summaryPromise;
}
if (typeof window !== 'undefined') void summaryOnce().catch(() => {});

function useSummary(): SummaryState {
  const [state, setState] = useState<SummaryState>(() => {
    if (typeof window === 'undefined') return { status: 'loading' };
    const cached = readCached();
    return cached ? { status: 'ready', summary: cached } : { status: 'loading' };
  });
  useEffect(() => {
    let cancelled = false;
    summaryOnce().then(
      (summary) => !cancelled && setState({ status: 'ready', summary }),
      // Keep showing a cached copy if the refresh fails.
      () => !cancelled && setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' })),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

const asPhotos = (urls: readonly string[]): TeaserPhoto[] => urls.map((url) => ({ key: url, url, alt: '' }));

/** Region-wide figures (Veneto counts, weekly bars, city map) for the hook, weekly, map and paywall. */
export function useRegionTeaser(): RegionTeaserState {
  const summary = useSummary();
  if (summary.status !== 'ready') return summary;
  const s = summary.summary;
  const now = Date.now();
  return {
    status: 'ready',
    venetoCount: s.venetoCount,
    venetoNew7d: s.venetoRecentMs.length,
    collage: asPhotos(s.collage),
    daily: dailyCountsFromMs(s.venetoRecentMs, now),
    newestMs: s.newestMs,
    cityCount: s.cityCount,
    map: s.map,
  };
}

/**
 * Real count + photos for the picked city ('all' = every covered city), narrowed to the picked interests'
 * categories so "the free things you're interested in" is literally true (Guang, 2026-11-08).
 */
export function useCityTeaser(city: ConsumerCityKey | 'all' | null, categories: readonly string[] = []): CityTeaserState {
  const summary = useSummary();
  if (!city || summary.status !== 'ready') return summary.status === 'error' ? summary : { status: 'loading' };
  const { count, photos } = cityTeaserFromSummary(summary.summary, city, categories);
  return { status: 'ready', count, photos: asPhotos(photos) };
}
