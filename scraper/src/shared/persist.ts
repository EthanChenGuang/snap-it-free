import type { SupabaseClient } from '@supabase/supabase-js';
import type { RawListing } from '../subito/extract.js';
import { computeExpiresAt, normalizeRawListing } from './normalize.js';
import { normalizeVintedRawListing } from '../vinted/normalize.js';
import { normalizeFacebookRawListing } from '../facebook/normalize.js';
import type { CanonicalListing } from './schema.js';
import { translateBatch, type TranslationWorkItem } from '../translate/ingest.js';

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

function descriptionFromListing(listing: CanonicalListing): string | null {
  const payload = listing.raw_payload;
  if (payload && typeof payload.description === 'string') {
    return payload.description;
  }
  return null;
}

export async function persistListing(
  supabase: SupabaseClient,
  listing: CanonicalListing,
): Promise<{ result: PersistResult; listingId: string | null }> {
  const { data: existing, error: selectError } = await supabase
    .from('listings')
    .select('id, content_hash, crawl_content_hash, category')
    .eq('source', listing.source)
    .eq('external_id', listing.external_id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.content_hash === listing.content_hash) {
    const now = new Date();
    const touchRow: Record<string, string> = {
      status: 'active',
      expires_at: computeExpiresAt(listing.posted_at, now).toISOString(),
      scraped_at: now.toISOString(),
    };
    const crawlHashChanged =
      listing.crawl_content_hash != null &&
      listing.crawl_content_hash !== (existing.crawl_content_hash as string | null);
    if (listing.crawl_content_hash != null) {
      touchRow.crawl_content_hash = listing.crawl_content_hash;
    }
    if (crawlHashChanged && listing.category != null) {
      touchRow.category = listing.category;
    }
    const { error: touchError } = await supabase
      .from('listings')
      .update(touchRow)
      .eq('id', existing.id);

    if (touchError) {
      throw touchError;
    }

    return { result: 'skipped', listingId: (existing.id as string) ?? null };
  }

  const row = {
    source: listing.source,
    external_id: listing.external_id,
    title: listing.title,
    description: descriptionFromListing(listing),
    photo_url: listing.photo_url,
    external_url: listing.external_url,
    lat: listing.lat,
    lng: listing.lng,
    zone: listing.zone,
    city: listing.city ?? null,
    region: listing.region ?? null,
    status: listing.status,
    posted_at: listing.posted_at.toISOString(),
    expires_at: listing.expires_at.toISOString(),
    content_hash: listing.content_hash,
    ...(listing.crawl_content_hash != null
      ? { crawl_content_hash: listing.crawl_content_hash }
      : {}),
    scraped_at: new Date().toISOString(),
    category: listing.category ?? null,
    raw_payload: listing.raw_payload ?? null,
    geom:
      listing.lat != null && listing.lng != null
        ? `SRID=4326;POINT(${listing.lng} ${listing.lat})`
        : null,
  };

  const { data: upserted, error: upsertError } = await supabase
    .from('listings')
    .upsert(row, { onConflict: 'source,external_id' })
    .select('id')
    .single();

  if (upsertError) {
    throw upsertError;
  }

  const listingId = upserted.id as string;
  const persistResult: PersistResult = existing ? 'updated' : 'inserted';

  return { result: persistResult, listingId };
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

  const translationWork: TranslationWorkItem[] = [];

  for (const raw of rawListings) {
    const result =
      raw.source === 'vinted'
        ? normalizeVintedRawListing(raw)
        : raw.source === 'facebook'
          ? normalizeFacebookRawListing(raw)
          : normalizeRawListing(raw);

    if ('reject' in result) {
      await logReject(supabase, scrapeRunId, raw.external_id, result.reject, {
        title: raw.title,
        description: raw.description,
        external_url: raw.external_url,
        photo_url: raw.photo_url,
        posted_at: raw.posted_at,
        lat: raw.lat,
        lng: raw.lng,
        price: raw.price,
        image_urls: raw.image_urls,
        source_category_url: raw.source_category_url,
      });
      stats.rejected += 1;
      continue;
    }

    const { result: persistResult, listingId } = await persistListing(supabase, result);
    if (persistResult === 'inserted') stats.inserted += 1;
    else if (persistResult === 'updated') stats.updated += 1;
    else stats.skipped += 1;

    if (persistResult !== 'skipped' && listingId) {
      translationWork.push({
        listingId,
        fields: {
          title: result.title,
          description: descriptionFromListing(result),
          category: result.category ?? null,
        },
      });
    }
  }

  await translateBatch(supabase, translationWork);

  return stats;
}
