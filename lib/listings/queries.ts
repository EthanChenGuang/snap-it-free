import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ListingRow, OwnerListingRow } from './types';

const PUBLIC_LISTINGS = 'listings_public';
const BASE_LISTINGS = 'listings';

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at, status';

const OWNER_LISTING_COLUMNS =
  'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at, status, owner_user_id, hidden_reason, description';

export async function getActiveListings(): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .not('zone', 'is', null)
    .order('posted_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as ListingRow[];
}

export async function getListingsByIds(ids: string[]): Promise<ListingRow[]> {
  if (!getSupabaseEnv() || ids.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .in('id', ids)
    .order('posted_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as ListingRow[];
}

export async function getListingById(id: string): Promise<ListingRow | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .eq('id', id)
    .not('zone', 'is', null)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as ListingRow | null) ?? null;
}

export async function getOwnerListingById(id: string): Promise<OwnerListingRow | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from(BASE_LISTINGS)
    .select(OWNER_LISTING_COLUMNS)
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as OwnerListingRow | null) ?? null;
}

export async function getOwnerListings(): Promise<OwnerListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(BASE_LISTINGS)
    .select(OWNER_LISTING_COLUMNS)
    .eq('owner_user_id', user.id)
    .eq('source', 'ugc')
    .order('posted_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as OwnerListingRow[];
}

export async function getListingForDetail(
  id: string,
): Promise<{ listing: ListingRow | OwnerListingRow; isOwnerView: boolean } | null> {
  const ownerListing = await getOwnerListingById(id);
  if (ownerListing) {
    return { listing: ownerListing, isOwnerView: true };
  }

  const publicListing = await getListingById(id);
  if (publicListing) {
    return { listing: publicListing, isOwnerView: false };
  }

  return null;
}
