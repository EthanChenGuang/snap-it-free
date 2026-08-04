import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUBITO_CATEGORY_URLS } from './subito/categories.js';
import { loadSourceConfig, mergeTargetUrls } from './config-loader.js';

describe('mergeTargetUrls', () => {
  it('uses SUBITO_CATEGORY_URLS fallback when DB URLs are empty', () => {
    expect(mergeTargetUrls([], SUBITO_CATEGORY_URLS)).toEqual([...SUBITO_CATEGORY_URLS]);
    expect(mergeTargetUrls(null, SUBITO_CATEGORY_URLS)).toEqual([...SUBITO_CATEGORY_URLS]);
    expect(mergeTargetUrls(undefined, SUBITO_CATEGORY_URLS)).toEqual([...SUBITO_CATEGORY_URLS]);
  });

  it('prefers DB URLs when present', () => {
    const db = ['https://www.subito.it/custom/'];
    expect(mergeTargetUrls(db, SUBITO_CATEGORY_URLS)).toEqual(db);
  });
});

function mockSupabase(responses: {
  source: Record<string, unknown> | null;
  global?: Record<string, unknown> | null;
}): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'scraper_sources') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: responses.source, error: null }),
          }),
        }),
      };
    }
    if (table === 'scraper_global_config') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: responses.global ?? { global_pause: false, proxy_enc: null },
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { from } as unknown as SupabaseClient;
}

describe('loadSourceConfig', () => {
  it('falls back to SUBITO_CATEGORY_URLS when DB target_urls are empty', async () => {
    const supabase = mockSupabase({
      source: {
        slug: 'subito',
        target_urls: [],
        anti_block_preset: 'standard',
        enabled: true,
        implementation_status: 'live',
      },
      global: { global_pause: false, proxy_enc: null },
    });

    const config = await loadSourceConfig(supabase, 'subito');
    expect(config).not.toBeNull();
    expect(config!.urls).toEqual([...SUBITO_CATEGORY_URLS]);
    expect(config!.preset).toBe('standard');
    expect(config!.globalPause).toBe(false);
  });

  it('returns null for unknown source slug', async () => {
    const supabase = mockSupabase({ source: null });
    const config = await loadSourceConfig(supabase, 'missing');
    expect(config).toBeNull();
  });

  it('uses DB URLs when present', async () => {
    const dbUrls = ['https://www.subito.it/db-only/'];
    const supabase = mockSupabase({
      source: {
        slug: 'subito',
        target_urls: dbUrls,
        anti_block_preset: 'aggressive',
        enabled: false,
        implementation_status: 'live',
      },
    });

    const config = await loadSourceConfig(supabase, 'subito');
    expect(config!.urls).toEqual(dbUrls);
    expect(config!.preset).toBe('aggressive');
    expect(config!.enabled).toBe(false);
  });
});
