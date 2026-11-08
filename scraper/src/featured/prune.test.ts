import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { pruneFeatured } from './prune.js';

type Row = { id: string; listing_id: string; studio_path: string };

/** Minimal chainable fake: each select() resolves to the next queued result. */
function fake(selectResults: Row[][], activeListingIds: string[]) {
  const removedPaths: string[] = [];
  const deletedIds: string[] = [];
  const queue = [...selectResults];
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['eq', 'lt', 'gt', 'neq', 'in']) c[m] = () => c;
    c.then = (res: (v: unknown) => void) => res(result);
    return c;
  };
  const client = {
    storage: { from: () => ({ remove: async (p: string[]) => (removedPaths.push(...p), { error: null }) }) },
    from: (table: string) => ({
      select: () =>
        table === 'listings'
          ? chain({ data: activeListingIds.map((id) => ({ id })), error: null })
          : chain({ data: queue.shift() ?? [], error: null }),
      delete: () => ({ in: async (_c: string, ids: string[]) => (deletedIds.push(...ids), { error: null }) }),
    }),
  } as unknown as SupabaseClient;
  return { client, removedPaths, deletedIds };
}

describe('pruneFeatured', () => {
  it('removes rejected, stale pending and expired-listing candidates (objects and rows)', async () => {
    const f = fake(
      [
        [{ id: 'r1', listing_id: 'L1', studio_path: 'd/L1.webp' }], // rejected > 1 day
        [{ id: 's1', listing_id: 'L2', studio_path: 'd/L2.webp' }], // pending > 7 days
        [
          { id: 'a1', listing_id: 'L3', studio_path: 'd/L3.webp' }, // still active
          { id: 'x1', listing_id: 'L4', studio_path: 'd/L4.webp' }, // listing gone
        ],
      ],
      ['L3'],
    );
    const n = await pruneFeatured(f.client, new Date('2026-11-08T05:00:00Z'));
    expect(n).toBe(3);
    expect(f.deletedIds.sort()).toEqual(['r1', 's1', 'x1']);
    expect(f.removedPaths.sort()).toEqual(['d/L1.webp', 'd/L2.webp', 'd/L4.webp']);
  });

  it('is a no-op when nothing qualifies', async () => {
    const f = fake([[], [], []], []);
    expect(await pruneFeatured(f.client, new Date())).toBe(0);
    expect(f.deletedIds).toEqual([]);
  });
});
