import type { SupabaseClient } from '@supabase/supabase-js';

export async function loadKnownListingSet(
  supabase: SupabaseClient,
  source = 'subito',
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('listings')
    .select('external_id, crawl_content_hash')
    .eq('source', source);

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const externalId = row.external_id as string;
    const crawlHash = (row.crawl_content_hash as string | null) ?? '';
    map.set(externalId, crawlHash);
  }

  return map;
}
