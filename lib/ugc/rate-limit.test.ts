import { describe, expect, it, vi } from 'vitest';
import { assertCanPost, assertCanStartConversation, RateLimitError } from './rate-limit';

function mockSupabaseCount(count: number | null, error: Error | null = null) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    then: (resolve: (value: { count: number | null; error: Error | null }) => void) =>
      Promise.resolve(resolve({ count, error })),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

describe('assertCanPost', () => {
  it('throws when count equals 3 in rolling 24h window', async () => {
    const supabase = mockSupabaseCount(3);
    await expect(assertCanPost(supabase as never, 'user-1')).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it('allows when count is below limit', async () => {
    const supabase = mockSupabaseCount(2);
    await expect(assertCanPost(supabase as never, 'user-1')).resolves.toBeUndefined();
  });
});

describe('assertCanStartConversation', () => {
  it('throws when count equals 5 in rolling 1h window', async () => {
    const supabase = mockSupabaseCount(5);
    await expect(assertCanStartConversation(supabase as never, 'user-1')).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it('allows when count is below limit', async () => {
    const supabase = mockSupabaseCount(4);
    await expect(assertCanStartConversation(supabase as never, 'user-1')).resolves.toBeUndefined();
  });
});
