import type { SupabaseClient } from '@supabase/supabase-js';

export const FEATURED_BUCKET = 'featured-photos';
const DAY_MS = 86_400_000;
/** Unreviewed candidates are dropped after this long to bound storage. */
export const PENDING_MAX_AGE_DAYS = 7;

type CandidateRef = { id: string; listing_id: string; studio_path: string };

async function removeRows(supabase: SupabaseClient, rows: CandidateRef[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error: rmErr } = await supabase.storage
    .from(FEATURED_BUCKET)
    .remove(rows.map((r) => r.studio_path));
  if (rmErr) throw new Error(`featured prune: storage remove failed: ${rmErr.message}`);
  const { error } = await supabase
    .from('featured_candidates')
    .delete()
    .in('id', rows.map((r) => r.id));
  if (error) throw new Error(`featured prune: delete rows failed: ${error.message}`);
  return rows.length;
}

/**
 * Delete objects + rows for: rejected (reviewed > 1 day ago), pending older than
 * PENDING_MAX_AGE_DAYS, and any candidate whose listing is no longer active/unexpired.
 */
export async function pruneFeatured(supabase: SupabaseClient, now: Date): Promise<number> {
  let removed = 0;

  const rejectedBefore = new Date(now.getTime() - DAY_MS).toISOString();
  const { data: rejected, error: rejErr } = await supabase
    .from('featured_candidates')
    .select('id, listing_id, studio_path')
    .eq('status', 'rejected')
    .lt('reviewed_at', rejectedBefore);
  if (rejErr) throw new Error(`featured prune: load rejected failed: ${rejErr.message}`);
  removed += await removeRows(supabase, (rejected ?? []) as CandidateRef[]);

  const pendingBefore = new Date(now.getTime() - PENDING_MAX_AGE_DAYS * DAY_MS).toISOString();
  const { data: stale, error: staleErr } = await supabase
    .from('featured_candidates')
    .select('id, listing_id, studio_path')
    .eq('status', 'pending')
    .lt('created_at', pendingBefore);
  if (staleErr) throw new Error(`featured prune: load stale failed: ${staleErr.message}`);
  removed += await removeRows(supabase, (stale ?? []) as CandidateRef[]);

  const { data: live, error: liveErr } = await supabase
    .from('featured_candidates')
    .select('id, listing_id, studio_path')
    .neq('status', 'rejected');
  if (liveErr) throw new Error(`featured prune: load live failed: ${liveErr.message}`);
  const liveRows = (live ?? []) as CandidateRef[];
  const active = new Set<string>();
  for (let i = 0; i < liveRows.length; i += 200) {
    const ids = liveRows.slice(i, i + 200).map((r) => r.listing_id);
    const { data: ok, error } = await supabase
      .from('listings')
      .select('id')
      .in('id', ids)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString());
    if (error) throw new Error(`featured prune: load listings failed: ${error.message}`);
    for (const r of ok ?? []) active.add((r as { id: string }).id);
  }
  removed += await removeRows(supabase, liveRows.filter((r) => !active.has(r.listing_id)));

  return removed;
}
