import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ListingRow } from './types';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at';

function activeListingQuery(supabase: ReturnType<typeof createClient>) {
  return supabase
    .from('listings')
    .select(ACTIVE_LISTING_COLUMNS)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
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
    throw error;
  }

  return (data ?? []) as ListingRow[];
}

export async function fetchListingsByIdsClient(ids: string[]): Promise<ListingRow[]> {
  if (!getSupabaseEnv() || ids.length === 0) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(ACTIVE_LISTING_COLUMNS)
    .in('id', ids)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ListingRow[];
}
