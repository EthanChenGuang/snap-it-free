import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildOperatorMessage,
  downloadImage,
  runFeaturedTick,
  type CliRunner,
} from './run-featured-tick.js';
import type { SelectedCandidate } from './select-candidates.js';

function fakeSupabase() {
  const uploads: string[] = [];
  const removed: string[] = [];
  const inserts: Record<string, unknown>[] = [];
  let failInsertFor: string | null = null;
  const client = {
    storage: {
      from: () => ({
        upload: vi.fn(async (p: string) => {
          uploads.push(p);
          return { error: null };
        }),
        remove: vi.fn(async (ps: string[]) => {
          removed.push(...ps);
          return { error: null };
        }),
      }),
    },
    from: () => ({
      insert: vi.fn(async (row: Record<string, unknown>) => {
        if (row.listing_id === failInsertFor) return { error: { message: 'dup' } };
        inserts.push(row);
        return { error: null };
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, uploads, removed, inserts, failInsert: (id: string) => (failInsertFor = id) };
}

const cands: SelectedCandidate[] = ['a', 'b', 'c'].map((id) => ({
  listingId: id,
  consumerCity: 'padova',
  sourceUrl: `https://images.sbito.it/${id}?rule=gallery-desktop-2x-auto`,
}));

const okFetch = (async () =>
  new Response(new Uint8Array([1, 2, 3]), { status: 200 })) as unknown as typeof fetch;

/** Fake Python CLI: a + c pass, b fails the gate. */
const fakeCli: CliRunner = async ({ inDir, outDir, reportPath }) => {
  await mkdir(outDir, { recursive: true });
  const rows = [];
  for (const id of ['a', 'b', 'c']) {
    const pass = id !== 'b';
    if (pass) await writeFile(path.join(outDir, `${id}.webp`), 'webp');
    rows.push({ listing_id: id, pass, reasons: pass ? [] : ['object under watermark zone'], seconds: 1 });
  }
  expect(inDir).toBeTruthy();
  await writeFile(reportPath, JSON.stringify(rows));
};

const fixedNow = () => new Date('2026-11-08T05:23:00Z');

describe('runFeaturedTick', () => {
  it('uploads and inserts only passing images, then notifies once', async () => {
    const sb = fakeSupabase();
    const notify = vi.fn(async () => {});
    const res = await runFeaturedTick({
      supabase: sb.client,
      now: fixedNow,
      fetchImpl: okFetch,
      runCli: fakeCli,
      loadCandidatesImpl: async () => cands,
      pruneImpl: async () => 0,
      notify,
      appUrl: 'https://app.example/',
    });
    expect(res).toMatchObject({ selected: 3, downloaded: 3, passed: 2, inserted: 2, timedOut: false });
    expect(sb.uploads).toEqual(['2026-11-08/a.webp', '2026-11-08/c.webp']);
    expect(sb.inserts.map((r) => r.listing_id)).toEqual(['a', 'c']);
    expect(sb.inserts[0]).toMatchObject({ status: 'pending', batch_date: '2026-11-08', consumer_city: 'padova' });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('今日精选：2 件新候选待审核 → https://app.example/admin/featured');
  });

  it('removes the uploaded object when the row insert fails (no orphans)', async () => {
    const sb = fakeSupabase();
    sb.failInsert('a');
    const res = await runFeaturedTick({
      supabase: sb.client, now: fixedNow, fetchImpl: okFetch, runCli: fakeCli,
      loadCandidatesImpl: async () => cands, pruneImpl: async () => 0,
    });
    expect(res.inserted).toBe(1);
    expect(sb.removed).toEqual(['2026-11-08/a.webp']);
  });

  it('time budget exceeded → remaining candidates untouched, no rows', async () => {
    const sb = fakeSupabase();
    let t = Date.parse('2026-11-08T05:00:00Z');
    const now = () => new Date((t += 10 * 60_000)); // +10 min per call
    const runCli = vi.fn(fakeCli);
    const res = await runFeaturedTick({
      supabase: sb.client, now, fetchImpl: okFetch, runCli, maxMinutes: 25,
      loadCandidatesImpl: async () => cands, pruneImpl: async () => 0,
    });
    expect(res.timedOut).toBe(true);
    expect(runCli).not.toHaveBeenCalled();
    expect(sb.inserts).toHaveLength(0);
    expect(sb.uploads).toHaveLength(0);
  });

  it('does not notify when nothing is inserted', async () => {
    const notify = vi.fn(async () => {});
    const res = await runFeaturedTick({
      supabase: fakeSupabase().client, now: fixedNow, notify,
      loadCandidatesImpl: async () => [], pruneImpl: async () => 0,
    });
    expect(res.selected).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it('skips failed downloads but continues', async () => {
    const sb = fakeSupabase();
    let n = 0;
    const flaky = (async () =>
      ++n === 2 ? new Response('no', { status: 404 }) : new Response(new Uint8Array([1]), { status: 200 })) as unknown as typeof fetch;
    const res = await runFeaturedTick({
      supabase: sb.client, now: fixedNow, fetchImpl: flaky, runCli: fakeCli,
      loadCandidatesImpl: async () => cands, pruneImpl: async () => 0,
    });
    expect(res.downloaded).toBe(2);
    expect(sb.inserts.map((r) => r.listing_id)).toEqual(['a', 'c']);
  });
});

describe('downloadImage', () => {
  it('rejects oversize responses', async () => {
    const big = (async () =>
      new Response('x', { status: 200, headers: { 'content-length': String(6 * 1024 * 1024) } })) as unknown as typeof fetch;
    await expect(downloadImage('https://images.sbito.it/x', big)).rejects.toThrow(/too large/);
  });

  it('refuses redirects', async () => {
    const spy = vi.fn(async (_u: unknown, init?: RequestInit) => {
      expect(init?.redirect).toBe('error');
      return new Response(new Uint8Array([1]), { status: 200 });
    });
    await downloadImage('https://images.sbito.it/x', spy as unknown as typeof fetch);
    expect(spy).toHaveBeenCalled();
  });
});

describe('buildOperatorMessage', () => {
  it('links to the review page', () => {
    expect(buildOperatorMessage(3, 'https://a.b')).toBe('今日精选：3 件新候选待审核 → https://a.b/admin/featured');
  });
});
