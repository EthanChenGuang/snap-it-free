import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { normalizeSubitoPhotoUrl } from '@/lib/listings/subito-photo-url';
import { featuredPhotoPublicUrl } from './queries';
import { FEATURED_PHOTOS_BUCKET } from './types';

/** Server-only helpers for the /admin/featured review flow (service-role client). */

export const featuredDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});
export type FeaturedDecision = z.infer<typeof featuredDecisionSchema>['decision'];

export type PendingFeaturedCandidate = {
  id: string;
  listingId: string;
  consumerCity: string;
  createdAt: string;
  studioUrl: string;
  /** Watermark-free Subito preset — never the stored gallery URL. */
  originalUrl: string | null;
  title: string;
  city: string | null;
};

type PendingRow = {
  id: string;
  listing_id: string;
  consumer_city: string;
  created_at: string;
  studio_path: string;
  listings: { title: string | null; title_zh: string | null; photo_url: string | null; city: string | null } | null;
};

export async function getPendingFeaturedCandidates(
  supabase: SupabaseClient,
  supabaseUrl: string,
  limit = 200,
): Promise<PendingFeaturedCandidate[]> {
  const { data, error } = await supabase
    .from('featured_candidates')
    .select('id, listing_id, consumer_city, created_at, studio_path, listings(title, title_zh, photo_url, city)')
    .eq('status', 'pending')
    .order('consumer_city', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[featured] load pending failed:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as PendingRow[]).map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    consumerCity: r.consumer_city,
    createdAt: r.created_at,
    studioUrl: featuredPhotoPublicUrl(supabaseUrl, r.studio_path),
    originalUrl: r.listings?.photo_url ? normalizeSubitoPhotoUrl(r.listings.photo_url) : null,
    title: r.listings?.title_zh || r.listings?.title || '',
    city: r.listings?.city ?? null,
  }));
}

export async function getPendingFeaturedCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('featured_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return error ? 0 : (count ?? 0);
}

export type DecideResult =
  | { ok: true; status: 'approved' | 'rejected' }
  | { ok: false; code: 'not_pending' | 'db_error'; message?: string };

/**
 * Apply an operator decision. Only rows still `pending` change (double taps / two devices
 * cannot flip a decision). Reject also deletes the stored studio image.
 */
export async function decideFeaturedCandidate(
  supabase: SupabaseClient,
  id: string,
  decision: FeaturedDecision,
  reviewer: string,
  now: Date = new Date(),
): Promise<DecideResult> {
  const status = decision === 'approve' ? 'approved' : 'rejected';
  const { data, error } = await supabase
    .from('featured_candidates')
    .update({ status, reviewed_at: now.toISOString(), reviewed_by: reviewer })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, studio_path')
    .maybeSingle();
  if (error) return { ok: false, code: 'db_error', message: error.message };
  if (!data) return { ok: false, code: 'not_pending' };
  if (status === 'rejected') {
    const { error: rmErr } = await supabase.storage
      .from(FEATURED_PHOTOS_BUCKET)
      .remove([(data as { studio_path: string }).studio_path]);
    // The daily prune removes leftovers of rejected rows too, so a failed delete is not fatal.
    if (rmErr) console.warn('[featured] reject: storage remove failed:', rmErr.message);
  }
  return { ok: true, status };
}
