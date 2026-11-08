import { createAnonClient } from '@/lib/supabase/anon';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ConsumerCity } from '@/lib/listings/filters';
import {
  FEATURED_PHOTOS_BUCKET,
  FEATURED_PICKS_CAP,
  FEATURED_PICKS_VIEW,
  type FeaturedPick,
  type FeaturedPickRow,
} from './types';

const COLUMNS =
  'id, listing_id, consumer_city, studio_path, reviewed_at, title, title_en, title_zh, city, category';

export function featuredPhotoPublicUrl(supabaseUrl: string, studioPath: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const path = studioPath.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${FEATURED_PHOTOS_BUCKET}/${path}`;
}

function byReviewedDesc(a: FeaturedPickRow, b: FeaturedPickRow): number {
  return (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? '');
}

/**
 * Approved featured picks, newest review first, capped per consumer city.
 * Never throws: any failure returns [] so the home feed cannot break.
 */
export async function getFeaturedPicks(
  options: { limitPerCity?: number } = {},
): Promise<FeaturedPick[]> {
  const limitPerCity = options.limitPerCity ?? FEATURED_PICKS_CAP;
  try {
    const env = getSupabaseEnv();
    if (!env) return [];
    const { data, error } = await createAnonClient()
      .from(FEATURED_PICKS_VIEW)
      .select(COLUMNS)
      .order('reviewed_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('[featured] getFeaturedPicks failed:', error.message);
      return [];
    }
    const rows = ((data ?? []) as FeaturedPickRow[]).slice().sort(byReviewedDesc);
    const perCity = new Map<string, number>();
    const picks: FeaturedPick[] = [];
    for (const row of rows) {
      const n = perCity.get(row.consumer_city) ?? 0;
      if (n >= limitPerCity) continue;
      perCity.set(row.consumer_city, n + 1);
      picks.push({ ...row, imageUrl: featuredPhotoPublicUrl(env.url, row.studio_path) });
    }
    return picks;
  } catch (err) {
    console.error('[featured] getFeaturedPicks failed:', err);
    return [];
  }
}

/** Picks for the feed's applied city filter. `other` has no curated picks. */
export function selectPicksForCity(picks: readonly FeaturedPick[], city: ConsumerCity): FeaturedPick[] {
  if (city === 'other') return [];
  const pool = city === 'all' ? picks : picks.filter((p) => p.consumer_city === city);
  return pool.slice().sort(byReviewedDesc).slice(0, FEATURED_PICKS_CAP);
}
