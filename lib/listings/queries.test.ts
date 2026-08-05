import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACTIVE_COLUMNS =
  'id, source, title, title_en, title_zh, photo_url, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockNot = vi.fn();
const mockOrder = vi.fn();
const mockMaybeSingle = vi.fn();

mockMaybeSingle.mockReturnValue({ data: null, error: null });
mockOrder.mockReturnValue({ data: [], error: null });
mockNot.mockReturnValue({ order: mockOrder, maybeSingle: mockMaybeSingle });
mockEq.mockReturnValue({ eq: mockEq, not: mockNot });
mockSelect.mockReturnValue({ eq: mockEq, not: mockNot, order: mockOrder });

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
    mockNot.mockReturnValue({ order: mockOrder, maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot });
    mockSelect.mockReturnValue({ eq: mockEq, not: mockNot, order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('queries listings_public without zone filter — view handles D-28 visibility', async () => {
    const { getActiveListings } = await import('./queries');

    await getActiveListings();

    expect(mockFrom).toHaveBeenCalledWith('listings_public');
    expect(mockSelect).toHaveBeenCalledWith(ACTIVE_COLUMNS);
    expect(mockNot).not.toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalledWith('posted_at', { ascending: false });
  });
});

describe('getListingById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockReturnValue({ data: null, error: null });
    mockNot.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq, not: mockNot });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns null when listing is missing from listings_public', async () => {
    mockMaybeSingle.mockReturnValue({ data: null, error: null });

    const { getListingById } = await import('./queries');
    const result = await getListingById('550e8400-e29b-41d4-a716-446655440000');

    expect(result).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('listings_public');
    expect(mockEq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
    expect(mockNot).not.toHaveBeenCalled();
    expect(mockMaybeSingle).toHaveBeenCalled();
  });
});
