import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ListingRow } from './types';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at';

export async function getActiveListings(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(ACTIVE_LISTING_COLUMNS)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ListingRow[];
}

/** Stub for Plan 03 detail route. */
export async function getListingById(_id: string): Promise<ListingRow | null> {
  return null;
}
