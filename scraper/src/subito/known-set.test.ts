import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadKnownListingSet } from './known-set.js';

function createMockSupabase(rows: Array<{ external_id: string; crawl_content_hash: string | null }>, error: Error | null = null) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return {
    supabase: { from } as unknown as SupabaseClient,
    from,
    select,
    eq,
  };
}

describe('loadKnownListingSet', () => {
  it('returns Map of external_id to crawl_content_hash in one query', async () => {
    const { supabase, from, select, eq } = createMockSupabase([
      { external_id: '111', crawl_content_hash: 'a'.repeat(64) },
      { external_id: '222', crawl_content_hash: null },
    ]);

    const map = await loadKnownListingSet(supabase, 'subito');

    expect(from).toHaveBeenCalledWith('listings');
    expect(select).toHaveBeenCalledWith('external_id, crawl_content_hash');
    expect(eq).toHaveBeenCalledWith('source', 'subito');
    expect(map.get('111')).toBe('a'.repeat(64));
    expect(map.get('222')).toBe('');
  });

  it('throws on Supabase error', async () => {
    const { supabase } = createMockSupabase([], new Error('db down'));
    await expect(loadKnownListingSet(supabase)).rejects.toThrow('db down');
  });
});
