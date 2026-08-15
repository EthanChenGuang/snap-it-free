import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { persistListing } from './persist.js';
import type { CanonicalListing } from './schema.js';

vi.mock('../translate/ingest.js', () => ({
  translateBatch: vi.fn().mockResolvedValue(undefined),
}));

const baseListing: CanonicalListing = {
  source: 'subito',
  external_id: '655558887',
  title: 'regalo lampada',
  photo_url: 'https://images.sbito.it/test/lamp.jpg',
  external_url: 'https://www.subito.it/annuncio/lamp-655558887.htm',
  lat: 45.434,
  lng: 12.338,
  zone: null,
  city: 'padova',
  region: 'veneto',
  category: 'informatica',
  status: 'active',
  posted_at: new Date('2026-07-25T10:00:00Z'),
  expires_at: new Date('2026-07-27T10:00:00Z'),
  content_hash: 'a'.repeat(64),
};

function createMockSupabase(options: {
  existingHash?: string | null;
  existingCrawlHash?: string | null;
  existingId?: string;
  upsertError?: Error | null;
  touchError?: Error | null;
}) {
  const upsertedId = options.existingId ?? 'listing-uuid-1';
  const single = vi.fn().mockResolvedValue({
    data: { id: upsertedId },
    error: options.upsertError ?? null,
  });
  const selectAfterUpsert = vi.fn().mockReturnValue({ single });
  const upsert = vi.fn().mockReturnValue({ select: selectAfterUpsert });
  const touchEq = vi.fn().mockResolvedValue({ error: options.touchError ?? null });
  const touchUpdate = vi.fn().mockReturnValue({ eq: touchEq });
  const maybeSingle = vi.fn().mockResolvedValue({
    data:
      options.existingHash != null
        ? {
            id: upsertedId,
            content_hash: options.existingHash,
            crawl_content_hash: options.existingCrawlHash ?? null,
            category: 'informatica',
          }
        : null,
    error: null,
  });

  const eqChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle,
  };

  const selectChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue(eqChain),
    }),
  };

  const from = vi.fn((table: string) => {
    if (table === 'listings') {
      return {
        ...selectChain,
        upsert,
        update: touchUpdate,
      };
    }
    return selectChain;
  });

  return {
    supabase: { from } as unknown as SupabaseClient,
    upsert,
    maybeSingle,
    touchUpdate,
    touchEq,
  };
}

describe('persistListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes expires_at when content_hash unchanged', async () => {
    const { supabase, upsert, touchUpdate, touchEq } = createMockSupabase({
      existingHash: baseListing.content_hash,
    });

    const result = await persistListing(supabase, baseListing);

    expect(result.result).toBe('skipped');
    expect(result.listingId).toBe('listing-uuid-1');
    expect(upsert).not.toHaveBeenCalled();
    expect(touchUpdate).toHaveBeenCalledOnce();
    expect(touchEq).toHaveBeenCalledWith('id', 'listing-uuid-1');
    const [touchRow] = touchUpdate.mock.calls[0];
    expect(touchRow.status).toBe('active');
    expect(touchRow.scraped_at).toBeDefined();
    expect(touchRow.expires_at).toBeDefined();
  });

  it('upserts new listing with geom WKT when coords present', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: null });

    const result = await persistListing(supabase, baseListing);

    expect(result.result).toBe('inserted');
    expect(result.listingId).toBe('listing-uuid-1');
    expect(upsert).toHaveBeenCalledOnce();
    const [row, options] = upsert.mock.calls[0];
    expect(row.geom).toBe('SRID=4326;POINT(12.338 45.434)');
    expect(row.scraped_at).toBeDefined();
    expect(row.city).toBe('padova');
    expect(row.region).toBe('veneto');
    expect(row.category).toBe('informatica');
    expect(options).toEqual({ onConflict: 'source,external_id' });
  });

  it('writes crawl_content_hash on insert when provided', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: null });
    const crawlHash = 'c'.repeat(64);

    await persistListing(supabase, { ...baseListing, crawl_content_hash: crawlHash });

    const [row] = upsert.mock.calls[0];
    expect(row.crawl_content_hash).toBe(crawlHash);
  });

  it('upserts with null geom when coords absent', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: null });
    const noCoords = { ...baseListing, lat: null, lng: null, content_hash: 'b'.repeat(64) };

    const result = await persistListing(supabase, noCoords);

    expect(result.result).toBe('inserted');
    const [row] = upsert.mock.calls[0];
    expect(row.geom).toBeNull();
  });

  it('updates category on touch when crawl_content_hash changes (D-18-56)', async () => {
    const { supabase, touchUpdate } = createMockSupabase({
      existingHash: baseListing.content_hash,
      existingCrawlHash: 'd'.repeat(64),
    });
    const newCrawlHash = 'e'.repeat(64);

    await persistListing(supabase, {
      ...baseListing,
      category: 'arredamento-casalinghi',
      crawl_content_hash: newCrawlHash,
    });

    const [touchRow] = touchUpdate.mock.calls[0];
    expect(touchRow.crawl_content_hash).toBe(newCrawlHash);
    expect(touchRow.category).toBe('arredamento-casalinghi');
  });

  it('returns updated when existing row hash differs', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: 'old-hash-value'.padEnd(64, '0') });

    const result = await persistListing(supabase, baseListing);

    expect(result.result).toBe('updated');
    expect(upsert).toHaveBeenCalledOnce();
  });
});
