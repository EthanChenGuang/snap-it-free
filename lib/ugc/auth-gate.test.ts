import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no session user exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { requireAuth } = await import('@/lib/supabase/auth');
    await expect(requireAuth()).resolves.toBeNull();
  });

  it('returns the user when getUser succeeds', async () => {
    const user = { id: 'user-123', email: 'test@example.com' } as User;
    mockGetUser.mockResolvedValue({ data: { user }, error: null });

    const { requireAuth } = await import('@/lib/supabase/auth');
    await expect(requireAuth()).resolves.toEqual(user);
  });
});
