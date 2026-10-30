import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FAVORITES_STORAGE_KEY,
  readFavoriteIds,
  writeFavoriteIds,
} from './storage';
import {
  __resetFavoritesStoreForTests,
  getFavoritesSnapshot,
  removeFavorite,
  subscribeFavorites,
} from './store';

const LISTING_ID = '550e8400-e29b-41d4-a716-446655440000';

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseEnv: () => true,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

describe('removeFavorite', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetFavoritesStoreForTests();
    vi.restoreAllMocks();
    subscribeFavorites(() => {});
    writeFavoriteIds([LISTING_ID]);
    getFavoritesSnapshot(); // ensure store started via subscribe
  });

  it('removes locally when DELETE fails (e.g. invalid JWT on server)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'JWT issued at future' }), { status: 500 })),
    );

    const removed = await removeFavorite(LISTING_ID);

    expect(removed).toBe(true);
    expect(readFavoriteIds()).toEqual([]);
  });

  it('removes locally for guest users without calling DELETE', async () => {
    vi.mocked(await import('@/lib/supabase/client')).createClient = vi.fn(
      () =>
        ({
          auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({
              data: { subscription: { unsubscribe: vi.fn() } },
            }),
          },
        }) as never,
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const removed = await removeFavorite(LISTING_ID);

    expect(removed).toBe(true);
    expect(readFavoriteIds()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
