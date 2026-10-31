'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { getCityByConsumerKey } from '@/lib/geo/italian-cities';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import { fetchActiveListingsClient } from '@/lib/listings/client-queries';
import { feedLookbackSinceIso } from '@/lib/listings/feed-window';
import { excludeReportedIds, listingConsumerCity } from '@/lib/listings/filters';
import { listingPhotoUrls } from '@/lib/listings/listing-photos';
import type { ListingRow } from '@/lib/listings/types';
import { isPaywallFlagEnabled } from '@/lib/paywall/gate';
import {
  activeCityCount,
  buildMapTeaser,
  dailyCountsLast7,
  newestPostedMs,
  type DailyCount,
  type MapTeaser,
} from '@/lib/paywall/onboarding-stats';
import { fetchPaywallTeaser, TEASER_PHOTO_LIMIT } from '@/lib/paywall/locked-preview';
import { CITY_TEASER_THUMBNAIL_LIMIT, summarizeCityTeaser } from '@/lib/paywall/teaser';
import { readReportedIds } from '@/lib/reports/storage';
import { createAnonClient } from '@/lib/supabase/anon';
import { getSupabaseEnv } from '@/lib/supabase/env';

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
      /** Map screen: the busiest city's newest located items. */
      map: MapTeaser | null;
      /** Favourites screen: newest items with a photo. */
      favorites: ListingRow[];
    }
  | { status: 'error' };

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// One rows fetch shared across the hook instances (hook, preview, city teaser) in a single flow.
let rowsPromise: Promise<ListingRow[]> | null = null;
function activeRowsOnce(): Promise<ListingRow[]> {
  rowsPromise ??= fetchActiveListingsClient().then((all) => excludeReportedIds(all, readReportedIds()));
  return rowsPromise;
}

const VENETO_KEYS = new Set<ConsumerCityKey>(
  (['venice', 'padova', 'verona'] as ConsumerCityKey[]).filter(
    (key) => getCityByConsumerKey(key)?.region === 'veneto',
  ),
);

function isVeneto(listing: ListingRow): boolean {
  const key = listingConsumerCity(listing);
  return key !== null && VENETO_KEYS.has(key);
}

function distinctPhotos(listings: readonly ListingRow[], limit: number, language: 'en' | 'it' | 'zh'): TeaserPhoto[] {
  const out: TeaserPhoto[] = [];
  const seen = new Set<string>();
  for (const listing of listings) {
    if (out.length >= limit) break;
    const url = listingPhotoUrls(listing)[0];
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ key: url, url, alt: resolveListingTitle(listing, language) });
  }
  return out;
}

function newestWithPhoto(rows: readonly ListingRow[], limit: number): ListingRow[] {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())
    .filter((row) => {
      const url = listingPhotoUrls(row)[0];
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, limit);
}

/** Region-wide collage + honest Veneto counts for the hook and the paywall proof line, from real rows. */
export function useRegionTeaser(): RegionTeaserState {
  const { language } = useMessages();
  const [state, setState] = useState<RegionTeaserState>({ status: 'loading' });

  useEffect(() => {
    if (!getSupabaseEnv()) {
      setState({ status: 'error' });
      return;
    }
    let cancelled = false;
    activeRowsOnce().then(
      (rows) => {
        if (cancelled) return;
        const veneto = rows.filter(isVeneto);
        const now = Date.now();
        const cutoff = now - SEVEN_DAYS_MS;
        const scope = veneto.length > 0 ? veneto : rows;
        const venetoNew7d = veneto.filter((row) => {
          const posted = new Date(row.posted_at).getTime();
          return Number.isFinite(posted) && posted >= cutoff;
        }).length;
        setState({
          status: 'ready',
          venetoCount: veneto.length,
          venetoNew7d,
          collage: distinctPhotos(scope, TEASER_PHOTO_LIMIT, language),
          daily: dailyCountsLast7(scope, now),
          newestMs: newestPostedMs(scope, now),
          cityCount: activeCityCount(scope),
          map: buildMapTeaser(scope),
          favorites: newestWithPhoto(scope, 3),
        });
      },
      () => !cancelled && setState({ status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [language]);

  return state;
}

/**
 * Per-city teaser. Paywall on: the per-city definer function (044). Paywall off, or before 044:
 * summarize the rows the feed itself loads. Mirrors the original OnboardingFlow behaviour.
 */
export function useCityTeaser(city: ConsumerCityKey | null): CityTeaserState {
  const { language } = useMessages();
  const [state, setState] = useState<CityTeaserState>({ status: 'loading' });
  const rows = useCallback(() => activeRowsOnce(), []);
  const lastCity = useRef<ConsumerCityKey | null>(null);

  useEffect(() => {
    if (!isPaywallFlagEnabled() && getSupabaseEnv()) void rows().catch(() => {});
  }, [rows]);

  useEffect(() => {
    if (!city) return;
    if (!getSupabaseEnv()) {
      setState({ status: 'error' });
      return;
    }
    lastCity.current = city;
    let cancelled = false;
    setState({ status: 'loading' });
    const load = async (): Promise<CityTeaserState> => {
      if (isPaywallFlagEnabled()) {
        const teaser = await fetchPaywallTeaser(createAnonClient(), { city, since: feedLookbackSinceIso() });
        if (teaser && teaser.count !== null) {
          const photos = teaser.photoUrls.slice(0, CITY_TEASER_THUMBNAIL_LIMIT);
          return { status: 'ready', count: teaser.count, photos: photos.map((url) => ({ key: url, url, alt: '' })) };
        }
      }
      const summary = summarizeCityTeaser(await rows(), city);
      return {
        status: 'ready',
        count: summary.count,
        photos: summary.thumbnails.map((thumb) => ({
          key: thumb.id,
          url: thumb.photoUrl,
          alt: resolveListingTitle(thumb.listing, language),
        })),
      };
    };
    load().then(
      (next) => !cancelled && setState(next),
      () => !cancelled && setState({ status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [city, language, rows]);

  return state;
}
