import type { SupabaseClient } from '@supabase/supabase-js';
import { listingPhotoUrls } from '@/lib/listings/listing-photos';
import type { ListingRow } from '@/lib/listings/types';

/** Everything a locked view may show: a real count and up to 6 photo URLs. No ids, titles or places. */
export type PaywallTeaser = { count: number | null; photoUrls: string[] };

export const TEASER_PHOTO_LIMIT = 6;

/**
 * Reads public.listings_paywall_teaser (migration 044). Returns null when the function is missing
 * (044 not applied yet) or fails, so callers fall back to building the teaser from listing rows.
 */
export async function fetchPaywallTeaser(
  client: SupabaseClient,
  { city = null, since = null }: { city?: string | null; since?: string | null } = {},
): Promise<PaywallTeaser | null> {
  const { data, error } = await client.rpc('listings_paywall_teaser', {
    p_city: city,
    p_since: since,
    p_limit: TEASER_PHOTO_LIMIT,
  });
  const row = Array.isArray(data) ? (data[0] as { listing_count?: unknown; photo_urls?: unknown } | undefined) : undefined;
  if (error || !row) return null;
  const count = Number(row.listing_count);
  const photoUrls = Array.isArray(row.photo_urls)
    ? row.photo_urls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : [];
  return { count: Number.isFinite(count) ? count : null, photoUrls: photoUrls.slice(0, TEASER_PHOTO_LIMIT) };
}

/** Pre-044 fallback: the same shape from listing rows, distinct photos, newest first. */
export function teaserFromListings(
  listings: readonly ListingRow[],
  count: number | null,
  limit = TEASER_PHOTO_LIMIT,
): PaywallTeaser {
  const photoUrls: string[] = [];
  for (const listing of listings) {
    if (photoUrls.length >= limit) break;
    const url = listingPhotoUrls(listing)[0];
    if (url && !photoUrls.includes(url)) photoUrls.push(url);
  }
  return { count, photoUrls };
}
