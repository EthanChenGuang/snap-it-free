import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { persistListing } from './persist.js';
import type { CanonicalListing } from './schema.js';

const baseListing: CanonicalListing = {
  source: 'subito',
  external_id: '655558887',
  title: 'regalo lampada',
  photo_url: 'https://images.sbito.it/test/lamp.jpg',
  external_url: 'https://www.subito.it/annuncio/lamp-655558887.htm',
  lat: 45.434,
  lng: 12.338,
  zone: null,
  status: 'active',
  posted_at: new Date('2026-07-25T10:00:00Z'),
  expires_at: new Date('2026-07-27T10:00:00Z'),
  content_hash: 'a'.repeat(64),
};

function createMockSupabase(options: {
  existingHash?: string | null;
  upsertError?: Error | null;
}) {
  const upsert = vi.fn().mockResolvedValue({ error: options.upsertError ?? null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.existingHash != null ? { content_hash: options.existingHash } : null,
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
      };
    }
    return selectChain;
  });

  return { supabase: { from } as unknown as SupabaseClient, upsert, maybeSingle };
}

describe('persistListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns skipped without upsert when content_hash unchanged', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: baseListing.content_hash });

    const result = await persistListing(supabase, baseListing);

    expect(result).toBe('skipped');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts new listing with geom WKT when coords present', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: null });

    const result = await persistListing(supabase, baseListing);

    expect(result).toBe('inserted');
    expect(upsert).toHaveBeenCalledOnce();
    const [row, options] = upsert.mock.calls[0];
    expect(row.geom).toBe('SRID=4326;POINT(12.338 45.434)');
    expect(row.scraped_at).toBeDefined();
    expect(options).toEqual({ onConflict: 'source,external_id' });
  });

  it('upserts with null geom when coords absent', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: null });
    const noCoords = { ...baseListing, lat: null, lng: null, content_hash: 'b'.repeat(64) };

    const result = await persistListing(supabase, noCoords);

    expect(result).toBe('inserted');
    const [row] = upsert.mock.calls[0];
    expect(row.geom).toBeNull();
  });

  it('returns updated when existing row hash differs', async () => {
    const { supabase, upsert } = createMockSupabase({ existingHash: 'old-hash-value'.padEnd(64, '0') });

    const result = await persistListing(supabase, baseListing);

    expect(result).toBe('updated');
    expect(upsert).toHaveBeenCalledOnce();
  });
});
