import { NextResponse } from 'next/server';
import { feedLookbackSinceIso, fetchPagedRowsParallel } from '@/lib/listings/feed-window';
import type { ListingRow } from '@/lib/listings/types';
import { buildOnboardingSummary, SUMMARY_COLUMNS } from '@/lib/paywall/onboarding-summary';
import { createAnonClient } from '@/lib/supabase/anon';
import { getSupabaseEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

/**
 * Aggregated live figures for the onboarding (counts, 7-day stamps, city map, per-city/category counts and a
 * few photos). Same anon read the phone used to do itself, done once here and cached at the CDN for 5 minutes
 * (stale copies served for up to an hour while it refreshes), so onboarding screens no longer wait on ~40k rows.
 */
export async function GET() {
  if (!getSupabaseEnv()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const supabase = createAnonClient();
  const since = feedLookbackSinceIso();
  type SummaryRow = Pick<ListingRow, 'id' | 'photo_url' | 'photo_urls' | 'lat' | 'lng' | 'zone' | 'city' | 'category' | 'posted_at'>;
  // Pages are read concurrently (~2 round trips instead of ~40 one after another).
  const { data, error } = await fetchPagedRowsParallel<SummaryRow>(
    async (from, to) =>
      supabase
        .from('listings_public')
        .select(SUMMARY_COLUMNS)
        .gte('posted_at', since)
        .order('posted_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    async () => {
      const { count, error: countError } = await supabase
        .from('listings_public')
        .select('id', { count: 'exact', head: true })
        .gte('posted_at', since);
      return countError ? null : count;
    },
    8,
  );
  if (error) {
    console.error('[onboarding/summary] read failed:', error.message);
    return NextResponse.json({ error: 'read_failed' }, { status: 502 });
  }

  // The summary only reads the columns selected above (SUMMARY_COLUMNS).
  return NextResponse.json(buildOnboardingSummary(data as ListingRow[], Date.now()), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
