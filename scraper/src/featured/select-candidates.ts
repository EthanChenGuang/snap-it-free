import type { SupabaseClient } from '@supabase/supabase-js';
import { listingConsumerCity } from '../../../lib/listings/filters.js';
import type { ListingRow } from '../../../lib/listings/types.js';

/** Full-frame source preset. It carries the Subito watermark, so it is only ever an INPUT to the
 * cutout pipeline — the gate rejects any cutout touching the watermark corner and it is never displayed. */
export const FEATURED_SOURCE_RULE = 'gallery-desktop-2x-auto';
export const FEATURED_ALLOWED_HOST = 'images.sbito.it';
export const FEATURED_MAX_PER_CITY = 15;
export const FEATURED_SKIP_CATEGORIES = new Set(['animali']);

export type CandidateListing = Pick<
  ListingRow,
  'id' | 'category' | 'photo_url' | 'zone' | 'city' | 'lat' | 'lng' | 'posted_at'
>;

export type SelectedCandidate = {
  listingId: string;
  consumerCity: string;
  sourceUrl: string;
};

/** Swap to the full-frame source preset; null unless https on the Subito image host (SSRF guard). */
export function buildSourceUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  let url: URL;
  try {
    url = new URL(photoUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== FEATURED_ALLOWED_HOST || url.port !== '') {
    return null;
  }
  url.search = '';
  url.searchParams.set('rule', FEATURED_SOURCE_RULE);
  return url.toString();
}

/** Pure selection: newest first, ≤ cap per consumer city, skipping known/animal/unmapped rows. */
export function selectCandidates(
  rows: readonly CandidateListing[],
  alreadyProcessed: ReadonlySet<string>,
  cap = FEATURED_MAX_PER_CITY,
): SelectedCandidate[] {
  const sorted = [...rows].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''));
  const perCity = new Map<string, number>();
  const out: SelectedCandidate[] = [];
  for (const row of sorted) {
    if (alreadyProcessed.has(row.id)) continue;
    if (row.category && FEATURED_SKIP_CATEGORIES.has(row.category)) continue;
    const sourceUrl = buildSourceUrl(row.photo_url);
    if (!sourceUrl) continue;
    const city = listingConsumerCity(row as ListingRow);
    if (!city) continue;
    const n = perCity.get(city) ?? 0;
    if (n >= cap) continue;
    perCity.set(city, n + 1);
    out.push({ listingId: row.id, consumerCity: city, sourceUrl });
  }
  return out;
}

const CANDIDATE_COLUMNS = 'id, category, photo_url, zone, city, lat, lng, posted_at';

/** Subito listings posted in the window that have not been through the pipeline yet. */
export async function loadCandidates(
  supabase: SupabaseClient,
  now: Date,
  windowHours = 24,
): Promise<SelectedCandidate[]> {
  const since = new Date(now.getTime() - windowHours * 3600_000).toISOString();
  const { data, error } = await supabase
    .from('listings')
    .select(CANDIDATE_COLUMNS)
    .eq('source', 'subito')
    .eq('status', 'active')
    .gt('posted_at', since)
    .not('photo_url', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(`featured: load listings failed: ${error.message}`);
  const rows = (data ?? []) as CandidateListing[];

  const processed = new Set<string>();
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: seen, error: seenErr } = await supabase
      .from('featured_candidates')
      .select('listing_id')
      .in('listing_id', chunk);
    if (seenErr) throw new Error(`featured: load processed ids failed: ${seenErr.message}`);
    for (const s of seen ?? []) processed.add((s as { listing_id: string }).listing_id);
  }
  return selectCandidates(rows, processed);
}
