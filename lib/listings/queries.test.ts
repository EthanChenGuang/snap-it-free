import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACTIVE_COLUMNS =
  'id, source, title, title_en, title_zh, description, description_en, description_zh, photo_url, photo_urls, external_url, lat, lng, zone, city, region, category, category_en, category_zh, posted_at, expires_at, status';

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

  it('returns a mixed feed that preserves vinted-source rows (D-17-25)', async () => {
    const vintedRow = {
      id: '11111111-1111-4111-8111-111111111111',
      source: 'vinted',
      title: 'Free chair',
      title_en: null,
      title_zh: null,
      description: null,
      description_en: null,
      description_zh: null,
      photo_url: 'https://images1.vinted.net/t/x/f800/1.jpeg?s=a',
      external_url: 'https://www.vinted.it/items/1-free-chair',
      lat: null,
      lng: null,
      zone: null,
      city: null,
      region: null,
      category: null,
      category_en: null,
      category_zh: null,
      posted_at: '2026-08-15T10:00:00.000Z',
      expires_at: '2026-09-15T10:00:00.000Z',
      status: 'active',
    };
    mockOrder.mockReturnValue({ data: [vintedRow], error: null });

    const { getActiveListings } = await import('./queries');
    const result = await getActiveListings();

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('vinted');
    expect(result[0]?.external_url).toBe('https://www.vinted.it/items/1-free-chair');
    // No source exclusion filter — mixed chronological feed includes Vinted (D-17-25).
    expect(mockNot).not.toHaveBeenCalled();
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('returns a mixed feed that preserves facebook-source rows (D-18-41)', async () => {
    const facebookRow = {
      id: '22222222-2222-4222-8222-222222222222',
      source: 'facebook',
      title: 'Sedia gratis Venezia',
      title_en: null,
      title_zh: null,
      description: null,
      description_en: null,
      description_zh: null,
      photo_url: 'https://scontent.xx.fbcdn.net/v/t39.30808-6/sample-chair.jpg',
      external_url: 'https://www.facebook.com/marketplace/item/9876543210123456/',
      lat: null,
      lng: null,
      zone: null,
      city: null,
      region: null,
      category: null,
      category_en: null,
      category_zh: null,
      posted_at: '2026-08-15T11:00:00.000Z',
      expires_at: '2026-09-15T11:00:00.000Z',
      status: 'active',
    };
    mockOrder.mockReturnValue({ data: [facebookRow], error: null });

    const { getActiveListings } = await import('./queries');
    const result = await getActiveListings();

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('facebook');
    expect(result[0]?.external_url).toBe(
      'https://www.facebook.com/marketplace/item/9876543210123456/',
    );
    expect(mockNot).not.toHaveBeenCalled();
  });
});

describe('getActiveListingsCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('queries listings_public with head-only exact count', async () => {
    mockSelect.mockReturnValue({ count: 2345, error: null });

    const { getActiveListingsCount } = await import('./queries');
    const result = await getActiveListingsCount();

    expect(mockFrom).toHaveBeenCalledWith('listings_public');
    expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(result).toBe(2345);
  });

  it('returns null when count query fails', async () => {
    mockSelect.mockReturnValue({ count: null, error: { message: 'fail' } });

    const { getActiveListingsCount } = await import('./queries');
    const result = await getActiveListingsCount();

    expect(result).toBeNull();
  });
});

describe('getSimilarListings', () => {
  const mockLimit = vi.fn();
  const mockNeq = vi.fn();
  const mockIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockReturnValue({ data: [], error: null });
    mockNeq.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit });
    mockIn.mockReturnValue({ order: mockOrder, limit: mockLimit });
    mockOrder.mockReturnValue({ limit: mockLimit, eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder, limit: mockLimit, not: mockNot });
    mockNot.mockReturnValue({ order: mockOrder, limit: mockLimit });
    mockSelect.mockReturnValue({ eq: mockEq, neq: mockNeq, not: mockNot, order: mockOrder, limit: mockLimit });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('limits similar listings query instead of loading the full feed', async () => {
    const { getSimilarListings } = await import('./queries');

    await getSimilarListings({
      id: '550e8400-e29b-41d4-a716-446655440000',
      zone: null,
    });

    expect(mockFrom).toHaveBeenCalledWith('listings_public');
    expect(mockNeq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
    expect(mockLimit).toHaveBeenCalledWith(3);
    expect(mockNot).not.toHaveBeenCalled();
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
