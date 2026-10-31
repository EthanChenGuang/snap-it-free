import { isPaywallFlagEnabled } from '@/lib/paywall/gate';
import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { feedLookbackSinceIso, fetchPagedRowsParallel } from './feed-window';
import type { ListingRow } from './types';

const PUBLIC_LISTINGS = 'listings_public';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, title_en, title_zh, description, description_en, description_zh, photo_url, photo_urls, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';

/** Paywall on: the browser session's JWT lets the RLS gate (044) see the subscriber. Off: session-free as before. */
function listingsReadClient() {
  return isPaywallFlagEnabled() ? createClient() : createAnonClient();
}

export async function fetchActiveListingsClient(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = listingsReadClient();
  const since = feedLookbackSinceIso();
  // Order by posted_at then id so concurrent page reads see one stable ordering.
  const { data, error } = await fetchPagedRowsParallel<ListingRow>(
    async (from, to) =>
      supabase
        .from(PUBLIC_LISTINGS)
        .select(ACTIVE_LISTING_COLUMNS)
        .gte('posted_at', since)
        .order('posted_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    () => fetchActiveListingsCountClient(),
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchActiveListingsCountClient(): Promise<number> {
  if (!getSupabaseEnv()) {
    return 0;
  }

  const supabase = listingsReadClient();
  const { count, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select('id', { count: 'exact', head: true })
    .gte('posted_at', feedLookbackSinceIso());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchListingsByIdsClient(ids: string[]): Promise<ListingRow[]> {
  if (!getSupabaseEnv() || ids.length === 0) {
    return [];
  }

  const supabase = listingsReadClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .in('id', ids)
    .order('posted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ListingRow[];
}
