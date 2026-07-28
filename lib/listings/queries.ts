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

export async function getListingById(id: string): Promise<ListingRow | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(ACTIVE_LISTING_COLUMNS)
    .eq('id', id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .not('zone', 'is', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ListingRow | null) ?? null;
}
