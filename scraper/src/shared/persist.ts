import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalListing } from './schema.js';

export type PersistResult = 'skipped' | 'inserted' | 'updated';

export async function persistListing(
  supabase: SupabaseClient,
  listing: CanonicalListing,
): Promise<PersistResult> {
  const { data: existing, error: selectError } = await supabase
    .from('listings')
    .select('content_hash')
    .eq('source', listing.source)
    .eq('external_id', listing.external_id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.content_hash === listing.content_hash) {
    return 'skipped';
  }

  const row = {
    source: listing.source,
    external_id: listing.external_id,
    title: listing.title,
    photo_url: listing.photo_url,
    external_url: listing.external_url,
    lat: listing.lat,
    lng: listing.lng,
    zone: listing.zone,
    status: listing.status,
    posted_at: listing.posted_at.toISOString(),
    expires_at: listing.expires_at.toISOString(),
    content_hash: listing.content_hash,
    scraped_at: new Date().toISOString(),
    raw_payload: listing.raw_payload ?? null,
    geom:
      listing.lat != null && listing.lng != null
        ? `SRID=4326;POINT(${listing.lng} ${listing.lat})`
        : null,
  };

  const { error: upsertError } = await supabase
    .from('listings')
    .upsert(row, { onConflict: 'source,external_id' });

  if (upsertError) {
    throw upsertError;
  }

  return existing ? 'updated' : 'inserted';
}
