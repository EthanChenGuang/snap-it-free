import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ListingRow } from './types';

const PUBLIC_LISTINGS = 'listings_public';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at, status';

function activeListingQuery(supabase: ReturnType<typeof createClient>) {
  return supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false });
}

export async function fetchActiveListingsClient(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await activeListingQuery(supabase);

  if (error) {
    return [];
  }

  return (data ?? []) as ListingRow[];
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
