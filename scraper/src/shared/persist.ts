import type { SupabaseClient } from '@supabase/supabase-js';
import type { RawListing } from '../subito/extract.js';
import { normalizeRawListing } from './normalize.js';
import type { CanonicalListing } from './schema.js';

export type PersistResult = 'skipped' | 'inserted' | 'updated';

export type BatchPersistStats = {
  inserted: number;
  updated: number;
  skipped: number;
  rejected: number;
};

export async function logReject(
  supabase: SupabaseClient,
  scrapeRunId: string | null,
  externalId: string | null,
  reason: string,
  rawSnippet: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('scrape_rejects').insert({
    scrape_run_id: scrapeRunId,
    external_id: externalId,
    reject_reason: reason,
    raw_snippet: rawSnippet,
  });

  if (error) {
    throw error;
  }
}

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

export async function persistBatch(
  supabase: SupabaseClient,
  rawListings: RawListing[],
  scrapeRunId: string,
): Promise<BatchPersistStats> {
  const stats: BatchPersistStats = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    rejected: 0,
  };

  for (const raw of rawListings) {
    const result = normalizeRawListing(raw);

    if ('reject' in result) {
      await logReject(supabase, scrapeRunId, raw.external_id, result.reject, {
        title: raw.title,
        description: raw.description,
        external_url: raw.external_url,
      });
      stats.rejected += 1;
      continue;
    }

    const persistResult = await persistListing(supabase, result);
    if (persistResult === 'inserted') stats.inserted += 1;
    else if (persistResult === 'updated') stats.updated += 1;
    else stats.skipped += 1;
  }

  return stats;
}
