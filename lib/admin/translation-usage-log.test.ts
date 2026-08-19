import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { resolveTranslationCostUsd } from './translation-cost';
import { getListingUsageTotals } from './translation-usage-log';

describe('resolveTranslationCostUsd', () => {
  it('prefers provider-reported cost when present', () => {
    expect(resolveTranslationCostUsd('openrouter', 100, 50, 0.002)).toBe(0.002);
  });

  it('falls back to token pricing when reported cost is missing', () => {
    const computed = resolveTranslationCostUsd('gemini', 320, 130);
    expect(computed).toBeGreaterThan(0);
    expect(resolveTranslationCostUsd('gemini', 320, 130, null)).toBe(computed);
  });
});

type LogRow = {
  listing_id: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  provider: 'gemini' | 'openrouter';
  model: string;
  created_at: string;
};

/** Records the id batches PostgREST would receive, and serves matching rows per batch. */
function fakeSupabase(rows: LogRow[]) {
  const batches: string[][] = [];

  const client = {
    from: () => ({
      select: () => ({
        in: (_column: string, values: string[]) => {
          batches.push(values);
          const matched = rows.filter((row) => values.includes(row.listing_id));
          return {
            order: () => Promise.resolve({ data: matched, error: null }),
          };
        },
      }),
    }),
  } as unknown as SupabaseClient;

  return { client, batches };
}

describe('getListingUsageTotals', () => {
  it('splits large id lists so the PostgREST query string stays under the gateway limit', async () => {
    const listingIds = Array.from({ length: 500 }, (_, index) => `listing-${index}`);
    const { client, batches } = fakeSupabase([]);

    await getListingUsageTotals(client, listingIds);

    expect(batches).toHaveLength(4);
    expect(Math.max(...batches.map((batch) => batch.length))).toBeLessThanOrEqual(150);
    expect(batches.flat()).toEqual(listingIds);
  });

  it('sums tokens and cost across chunks and keeps the newest model per listing', async () => {
    const listingIds = Array.from({ length: 200 }, (_, index) => `listing-${index}`);
    const { client, batches } = fakeSupabase([
      {
        listing_id: 'listing-0',
        cost_usd: 0.002,
        input_tokens: 100,
        output_tokens: 40,
        provider: 'openrouter',
        model: 'qwen/qwen3-30b-a3b-instruct-2507',
        created_at: '2026-08-15T10:00:00Z',
      },
      {
        listing_id: 'listing-0',
        cost_usd: 0.001,
        input_tokens: 50,
        output_tokens: 20,
        provider: 'gemini',
        model: 'gemini-flash-latest',
        created_at: '2026-08-14T10:00:00Z',
      },
      {
        listing_id: 'listing-160',
        cost_usd: 0.003,
        input_tokens: 200,
        output_tokens: 60,
        provider: 'gemini',
        model: 'gemini-flash-latest',
        created_at: '2026-08-15T09:00:00Z',
      },
    ]);

    const totals = await getListingUsageTotals(client, listingIds);

    expect(batches).toHaveLength(2);
    expect(totals.get('listing-0')).toMatchObject({
      costUsd: 0.003,
      inputTokens: 150,
      outputTokens: 60,
      provider: 'openrouter',
    });
    // listing-160 lands in the second chunk, proving results are merged across requests.
    expect(totals.get('listing-160')).toMatchObject({
      costUsd: 0.003,
      inputTokens: 200,
      outputTokens: 60,
      provider: 'gemini',
    });
  });

  it('returns partial results when one chunk fails instead of dropping everything', async () => {
    const listingIds = Array.from({ length: 300 }, (_, index) => `listing-${index}`);
    let call = 0;
    const client = {
      from: () => ({
        select: () => ({
          in: (_column: string, values: string[]) => ({
            order: () => {
              call += 1;
              if (call === 1) {
                return Promise.resolve({ data: null, error: { message: 'fetch failed' } });
              }
              return Promise.resolve({
                data: [
                  {
                    listing_id: values[0],
                    cost_usd: 0.005,
                    input_tokens: 10,
                    output_tokens: 5,
                    provider: 'gemini' as const,
                    model: 'gemini-flash-latest',
                    created_at: '2026-08-15T10:00:00Z',
                  },
                ],
                error: null,
              });
            },
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const totals = await getListingUsageTotals(client, listingIds);

    expect(totals.size).toBe(1);
    expect(totals.get('listing-150')?.costUsd).toBe(0.005);
  });
});
