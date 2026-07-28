import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGt = vi.fn();
const mockNot = vi.fn();
const mockOrder = vi.fn();
const mockMaybeSingle = vi.fn();

mockMaybeSingle.mockReturnValue({ data: null, error: null });
mockOrder.mockReturnValue({ data: [], error: null });
mockNot.mockReturnValue({ order: mockOrder });
mockGt.mockReturnValue({ not: mockNot, maybeSingle: mockMaybeSingle });
mockEq.mockReturnValue({ gt: mockGt, eq: mockEq });
mockSelect.mockReturnValue({ eq: mockEq });

const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseEnv: vi.fn(() => ({
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  })),
}));

describe('getActiveListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockReturnValue({ data: null, error: null });
    mockOrder.mockReturnValue({ data: [], error: null });
    mockNot.mockReturnValue({ order: mockOrder });
    mockGt.mockReturnValue({ not: mockNot, maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValue({ gt: mockGt, eq: mockEq });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('includes active status, future expires_at, and zone-not-null predicates', async () => {
    const { getActiveListings } = await import('./queries');

    await getActiveListings();

    expect(mockFrom).toHaveBeenCalledWith('listings');
    expect(mockSelect).toHaveBeenCalledWith(
      'id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at',
    );
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockGt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(mockNot).toHaveBeenCalledWith('zone', 'is', null);
    expect(mockOrder).toHaveBeenCalledWith('posted_at', { ascending: false });
  });
});

describe('getListingById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockReturnValue({ data: null, error: null });
    mockNot.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockGt.mockReturnValue({ not: mockNot });
    mockEq.mockReturnValue({ eq: mockEq, gt: mockGt });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns null for expired row mock', async () => {
    mockMaybeSingle.mockReturnValue({ data: null, error: null });

    const { getListingById } = await import('./queries');
    const result = await getListingById('550e8400-e29b-41d4-a716-446655440000');

    expect(result).toBeNull();
    expect(mockEq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockGt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(mockNot).toHaveBeenCalledWith('zone', 'is', null);
    expect(mockMaybeSingle).toHaveBeenCalled();
  });
});
