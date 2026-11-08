import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decideFeaturedCandidate, getPendingFeaturedCandidates } from './admin';

function updateClient(result: { data: unknown; error: unknown }) {
  const eqs: [string, unknown][] = [];
  const removed: string[][] = [];
  let updatePayload: unknown;
  const chain = {
    eq: (c: string, v: unknown) => (eqs.push([c, v]), chain),
    select: () => chain,
    maybeSingle: async () => result,
  };
  const client = {
    from: () => ({ update: (p: unknown) => ((updatePayload = p), chain) }),
    storage: { from: () => ({ remove: vi.fn(async (p: string[]) => (removed.push(p), { error: null })) }) },
  } as unknown as SupabaseClient;
  return { client, eqs, removed, payload: () => updatePayload };
}

describe('decideFeaturedCandidate', () => {
  const now = new Date('2026-11-08T09:00:00Z');

  it('approve only touches pending rows and records reviewer', async () => {
    const f = updateClient({ data: { id: 'c1', studio_path: 'd/a.webp' }, error: null });
    const res = await decideFeaturedCandidate(f.client, 'c1', 'approve', 'op@x.it', now);
    expect(res).toEqual({ ok: true, status: 'approved' });
    expect(f.eqs).toEqual([['id', 'c1'], ['status', 'pending']]);
    expect(f.payload()).toEqual({ status: 'approved', reviewed_at: now.toISOString(), reviewed_by: 'op@x.it' });
    expect(f.removed).toEqual([]);
  });

  it('reject deletes the studio image', async () => {
    const f = updateClient({ data: { id: 'c1', studio_path: 'd/a.webp' }, error: null });
    const res = await decideFeaturedCandidate(f.client, 'c1', 'reject', 'op@x.it', now);
    expect(res).toEqual({ ok: true, status: 'rejected' });
    expect(f.removed).toEqual([['d/a.webp']]);
  });

  it('already decided → not_pending, nothing deleted', async () => {
    const f = updateClient({ data: null, error: null });
    expect(await decideFeaturedCandidate(f.client, 'c1', 'reject', 'op', now)).toEqual({
      ok: false,
      code: 'not_pending',
    });
    expect(f.removed).toEqual([]);
  });
});

describe('getPendingFeaturedCandidates', () => {
  it('maps rows and never exposes the watermarked gallery URL', async () => {
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) chain[m] = () => chain;
    chain.limit = async () => ({
      data: [
        {
          id: 'c1',
          listing_id: 'L1',
          consumer_city: 'padova',
          created_at: '2026-11-08T05:30:00Z',
          studio_path: '2026-11-08/L1.webp',
          listings: {
            title: 'Seggiolino bici',
            title_zh: '儿童自行车座椅',
            photo_url: 'https://images.sbito.it/api/v1/x/images/63/abc?rule=gallery-mobile-1x-auto',
            city: 'padova',
          },
        },
      ],
      error: null,
    });
    const client = { from: () => chain } as unknown as SupabaseClient;
    const [c] = await getPendingFeaturedCandidates(client, 'https://p.supabase.co');
    expect(c!.title).toBe('儿童自行车座椅');
    expect(c!.studioUrl).toBe('https://p.supabase.co/storage/v1/object/public/featured-photos/2026-11-08/L1.webp');
    expect(c!.originalUrl).toContain('rule=card-desktop-new-small-4x-auto');
    expect(c!.originalUrl).not.toContain('gallery');
  });

  it('returns [] on error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) chain[m] = () => chain;
    chain.limit = async () => ({ data: null, error: { message: 'missing table' } });
    expect(await getPendingFeaturedCandidates({ from: () => chain } as unknown as SupabaseClient, 'u')).toEqual([]);
  });
});
