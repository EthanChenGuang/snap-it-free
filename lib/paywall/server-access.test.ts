import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuth = vi.fn();
const getSubscriptionForUser = vi.fn();
vi.mock('@/lib/supabase/auth', () => ({ requireAuth: () => requireAuth() }));
vi.mock('@/lib/subscriptions/store', () => ({
  getSubscriptionForUser: (id: string) => getSubscriptionForUser(id),
}));

const { getListingAccess } = await import('./server-access');

const FUTURE = '2099-01-01T00:00:00.000Z';

describe('getListingAccess', () => {
  beforeEach(() => {
    requireAuth.mockReset();
    getSubscriptionForUser.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is open with the flag off and no preview, without touching auth', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
    expect(await getListingAccess({})).toBe('open');
    expect(await getListingAccess({ onboarding: '0' })).toBe('open');
    expect(requireAuth.mock.calls.length).toBe(0);
  });

  it('locks a guest when the flag is on or the gate is previewed', async () => {
    requireAuth.mockResolvedValue(null);
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    expect(await getListingAccess({})).toBe('locked');
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
    expect(await getListingAccess({ onboarding: '1' })).toBe('locked');
  });

  it('opens for a signed-in user with an active subscription row', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    requireAuth.mockResolvedValue({ id: 'user-1' });
    getSubscriptionForUser.mockResolvedValue({ status: 'active', current_period_end: FUTURE });
    expect(await getListingAccess({})).toBe('open');
    expect(getSubscriptionForUser.mock.calls).toEqual([['user-1']]);
  });

  it('stays locked for past_due and fails closed on a read error', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    requireAuth.mockResolvedValue({ id: 'user-1' });
    getSubscriptionForUser.mockResolvedValueOnce({ status: 'past_due', current_period_end: FUTURE });
    expect(await getListingAccess({})).toBe('locked');
    getSubscriptionForUser.mockRejectedValueOnce(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getListingAccess({})).toBe('locked');
  });
});
