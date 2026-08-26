import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ListingRow } from './types';

const PUBLIC_LISTINGS = 'listings_public';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, title_en, title_zh, description, description_en, description_zh, photo_url, photo_urls, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';

function activeListingQuery(supabase: ReturnType<typeof createClient>) {
  return supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .order('posted_at', { ascending: false });
}

export async function fetchActiveListingsClient(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await activeListingQuery(supabase);

  if (error) {
    throw error;
  }

  return (data ?? []) as ListingRow[];
}

export async function fetchActiveListingsCountClient(): Promise<number> {
  if (!getSupabaseEnv()) {
    return 0;
  }

  const supabase = createClient();
  const { count, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchListingsByIdsClient(ids: string[]): Promise<ListingRow[]> {
  if (!getSupabaseEnv() || ids.length === 0) {
    return [];
  }

  const supabase = createClient();
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
