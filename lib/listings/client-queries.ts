import { createAnonClient } from '@/lib/supabase/anon';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { feedLookbackSinceIso, fetchPagedRows } from './feed-window';
import type { ListingRow } from './types';

const PUBLIC_LISTINGS = 'listings_public';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, title_en, title_zh, description, description_en, description_zh, photo_url, photo_urls, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';

export async function fetchActiveListingsClient(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = createAnonClient();
  const since = feedLookbackSinceIso();
  const { data, error } = await fetchPagedRows<ListingRow>(async (from, to) =>
    supabase
      .from(PUBLIC_LISTINGS)
      .select(ACTIVE_LISTING_COLUMNS)
      .gte('posted_at', since)
      .order('posted_at', { ascending: false })
      .range(from, to),
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

  const supabase = createAnonClient();
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

  const supabase = createAnonClient();
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
