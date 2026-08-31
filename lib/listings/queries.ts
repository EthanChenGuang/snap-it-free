import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { ListingRow, OwnerListingRow } from './types';

const PUBLIC_LISTINGS = 'listings_public';
const BASE_LISTINGS = 'listings';

/** SSR feed payload cap — keeps RSC/hydration under dev chunk limits (D-28, 260805-ws8). */
export const FEED_SSR_LISTING_LIMIT = 24;

const ACTIVE_LISTING_COLUMNS =
  'id, source, title, title_en, title_zh, description, description_en, description_zh, photo_url, photo_urls, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';

export type GetActiveListingsOptions = {
  /** When set, caps rows returned (used by feed SSR to avoid oversized RSC payloads). */
  limit?: number;
};

const OWNER_LISTING_COLUMNS =
  'id, source, title, photo_url, photo_urls, external_url, lat, lng, zone, posted_at, expires_at, status, owner_user_id, hidden_reason, description';

export async function getActiveListings(
  options: GetActiveListingsOptions = {},
): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = createAnonClient();
  let query = supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .order('posted_at', { ascending: false });

  if (options.limit != null) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[listings] getActiveListings failed:', error.message);
    return [];
  }

  return (data ?? []) as ListingRow[];
}

/** Exact row count on listings_public — head-only, no row payload (D-28 view rules). */
export async function getActiveListingsCount(): Promise<number | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = createAnonClient();
  const { count, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select('id', { count: 'exact', head: true });

  if (error) {
    return null;
  }

  return count ?? 0;
}

export async function getListingsByIds(ids: string[]): Promise<ListingRow[]> {
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
    return [];
  }

  return (data ?? []) as ListingRow[];
}

export async function getListingById(id: string): Promise<ListingRow | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .eq('id', id)
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

export async function getSimilarListings(
  current: Pick<ListingRow, 'id' | 'zone'>,
  limit = 3,
): Promise<ListingRow[]> {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = createAnonClient();
  const baseQuery = () =>
    supabase
      .from(PUBLIC_LISTINGS)
      .select(ACTIVE_LISTING_COLUMNS)
      .neq('id', current.id)
      .order('posted_at', { ascending: false })
      .limit(limit);

  if (current.zone) {
    const { data: zoneMatches, error: zoneError } = await baseQuery().eq('zone', current.zone);
    if (zoneError) {
      return [];
    }

    const zoneListings = (zoneMatches ?? []) as ListingRow[];
    if (zoneListings.length >= limit) {
      return zoneListings.slice(0, limit);
    }

    const remaining = limit - zoneListings.length;
    const excludeIds = [current.id, ...zoneListings.map((item) => item.id)];
    const { data: fallbackMatches, error: fallbackError } = await supabase
      .from(PUBLIC_LISTINGS)
      .select(ACTIVE_LISTING_COLUMNS)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('posted_at', { ascending: false })
      .limit(remaining);

    if (fallbackError) {
      return zoneListings;
    }

    return [...zoneListings, ...((fallbackMatches ?? []) as ListingRow[])];
  }

  const { data, error } = await baseQuery();
  if (error) {
    return [];
  }

  return (data ?? []) as ListingRow[];
}

export async function getListingForDetail(
  id: string,
): Promise<{ listing: ListingRow | OwnerListingRow; isOwnerView: boolean } | null> {
  const [ownerListing, publicListing] = await Promise.all([
    getOwnerListingById(id),
    getListingById(id),
  ]);

  if (ownerListing) {
    return { listing: ownerListing, isOwnerView: true };
  }

  if (publicListing) {
    return { listing: publicListing, isOwnerView: false };
  }

  return null;
}
