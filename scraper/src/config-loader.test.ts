import { afterEach, describe, expect, it, vi } from 'vitest';
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
  const originalProxyUrl = process.env.PROXY_URL;

  afterEach(() => {
    if (originalProxyUrl === undefined) {
      delete process.env.PROXY_URL;
    } else {
      process.env.PROXY_URL = originalProxyUrl;
    }
  });

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

  it('merges Padova informatica URL from DB over 3-URL fallback (D-18)', async () => {
    const padovaUrl =
      'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/';
    const supabase = mockSupabase({
      source: {
        slug: 'subito',
        target_urls: [padovaUrl],
        anti_block_preset: 'standard',
        enabled: true,
        implementation_status: 'live',
      },
    });

    const config = await loadSourceConfig(supabase, 'subito');
    expect(config!.urls).toEqual([padovaUrl]);
    expect(config!.urls[0]).toContain('/padova/padova/');
    expect(config!.urls).not.toEqual([...SUBITO_CATEGORY_URLS]);
  });

  it('defaults preset to standard when anti_block_preset is missing (D-21)', async () => {
    const supabase = mockSupabase({
      source: {
        slug: 'subito',
        target_urls: ['https://www.subito.it/db-only/'],
        anti_block_preset: null,
        enabled: true,
        implementation_status: 'live',
      },
    });

    const config = await loadSourceConfig(supabase, 'subito');
    expect(config!.preset).toBe('standard');
  });

  it('keeps Subito direct by default even when PROXY_URL is configured', async () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    const supabase = mockSupabase({
      source: {
        slug: 'subito',
        target_urls: ['https://www.subito.it/db-only/'],
        anti_block_preset: 'standard',
        enabled: true,
        implementation_status: 'live',
      },
      global: { global_pause: false, proxy_enc: null },
    });

    const config = await loadSourceConfig(supabase, 'subito');
    expect(config!.proxyUrl).toBeUndefined();
    expect(config!.proxyConfigured).toBe(false);
  });

  it('uses PROXY_URL for Vinted by default', async () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    const supabase = mockSupabase({
      source: {
        slug: 'vinted',
        target_urls: ['https://www.vinted.it/catalog?search_text=gratis'],
        anti_block_preset: 'standard',
        enabled: true,
        implementation_status: 'live',
      },
      global: { global_pause: false, proxy_enc: null },
    });

    const config = await loadSourceConfig(supabase, 'vinted');
    expect(config!.proxyUrl).toBe('http://env-proxy.example:8080');
    expect(config!.proxyConfigured).toBe(true);
  });

  it('disables PROXY_URL when source use_proxy_url is false', async () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    const supabase = mockSupabase({
      source: {
        slug: 'vinted',
        target_urls: ['https://www.vinted.it/catalog?search_text=gratis'],
        anti_block_preset: 'standard',
        enabled: true,
        implementation_status: 'live',
        use_proxy_url: false,
      },
      global: { global_pause: false, proxy_enc: null },
    });

    const config = await loadSourceConfig(supabase, 'vinted');
    expect(config!.proxyUrl).toBeUndefined();
    expect(config!.proxyConfigured).toBe(false);
    expect(config!.useProxyUrl).toBe(false);
  });

  it('disables PROXY_URL for subito when use_proxy_url is false', async () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    process.env.PROXY_URL_DATAIMPULSE = 'http://user:pass@gw.dataimpulse.com:823';
    const supabase = mockSupabase({
      source: {
        slug: 'subito',
        target_urls: ['https://www.subito.it/annunci-veneto/regalo/telefonia/verona/verona/'],
        anti_block_preset: 'conservative',
        enabled: true,
        implementation_status: 'live',
        use_proxy_url: false,
      },
      global: { global_pause: false, proxy_enc: null },
    });

    const config = await loadSourceConfig(supabase, 'subito');
    expect(config!.useProxyUrl).toBe(false);
    expect(config!.proxyUrl).toBeUndefined();
    expect(config!.proxyUrls).toEqual([]);
  });
});
