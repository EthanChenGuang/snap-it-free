import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeaturedPick } from './types';

const mockLimit = vi.fn();
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/anon', () => ({
  createAnonClient: vi.fn(() => ({ from: mockFrom })),
}));
const mockEnv = vi.fn(() => ({ url: 'https://example.supabase.co/', anonKey: 'anon' }) as unknown);
vi.mock('@/lib/supabase/env', () => ({ getSupabaseEnv: () => mockEnv() }));

import { featuredPhotoPublicUrl, getFeaturedPicks, selectPicksForCity } from './queries';

function row(id: string, city: string, reviewed: string) {
  return {
    id,
    listing_id: `l-${id}`,
    consumer_city: city,
    studio_path: `2026-11-08/l-${id}.webp`,
    reviewed_at: reviewed,
    title: `t${id}`,
    title_en: null,
    title_zh: null,
    city: null,
    category: null,
  };
}

describe('getFeaturedPicks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.mockReturnValue({ url: 'https://example.supabase.co/', anonKey: 'anon' });
  });

  it('reads the public view and builds bucket URLs', async () => {
    mockLimit.mockResolvedValue({ data: [row('1', 'venice', '2026-11-08T10:00:00Z')], error: null });
    const picks = await getFeaturedPicks();
    expect(mockFrom).toHaveBeenCalledWith('featured_picks_public');
    expect(picks[0].imageUrl).toBe(
      'https://example.supabase.co/storage/v1/object/public/featured-photos/2026-11-08/l-1.webp',
    );
  });

  it('caps per city', async () => {
    mockLimit.mockResolvedValue({
      data: [
        row('1', 'venice', '2026-11-08T03:00:00Z'),
        row('2', 'venice', '2026-11-08T02:00:00Z'),
        row('3', 'padova', '2026-11-08T01:00:00Z'),
      ],
      error: null,
    });
    const picks = await getFeaturedPicks({ limitPerCity: 1 });
    expect(picks.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('returns [] on empty result', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    expect(await getFeaturedPicks()).toEqual([]);
  });

  it('returns [] on query error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLimit.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } });
    expect(await getFeaturedPicks()).toEqual([]);
  });

  it('returns [] when the client throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLimit.mockRejectedValue(new Error('network'));
    expect(await getFeaturedPicks()).toEqual([]);
  });

  it('returns [] without Supabase env', async () => {
    mockEnv.mockReturnValue(null);
    expect(await getFeaturedPicks()).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('selectPicksForCity', () => {
  const picks = [
    row('1', 'venice', '2026-11-08T01:00:00Z'),
    row('2', 'padova', '2026-11-08T03:00:00Z'),
    row('3', 'venice', '2026-11-08T02:00:00Z'),
  ].map((r) => ({ ...r, imageUrl: 'x' })) as FeaturedPick[];

  it('all → every city, newest first', () => {
    expect(selectPicksForCity(picks, 'all').map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('other → none', () => {
    expect(selectPicksForCity(picks, 'other')).toEqual([]);
  });

  it('city key → that city only', () => {
    expect(selectPicksForCity(picks, 'venice').map((p) => p.id)).toEqual(['3', '1']);
  });

  it('caps at 20', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ...row(String(i), 'venice', `2026-11-08T00:00:${String(i).padStart(2, '0')}Z`),
      imageUrl: 'x',
    })) as FeaturedPick[];
    expect(selectPicksForCity(many, 'all')).toHaveLength(20);
  });
});

describe('featuredPhotoPublicUrl', () => {
  it('encodes path segments', () => {
    expect(featuredPhotoPublicUrl('https://a.co', 'd/x y.webp')).toBe(
      'https://a.co/storage/v1/object/public/featured-photos/d/x%20y.webp',
    );
  });
});
