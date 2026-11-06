import { describe, expect, it, vi } from 'vitest';
import { stopBillingBeforeDeletion } from './account-deletion';

const row = (status: string, id: string | null = 'sub_1') => ({
  status,
  current_period_end: null,
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: id,
  plan: 'yearly',
  cancel_at_period_end: false,
});

describe('stopBillingBeforeDeletion', () => {
  it('is a no-op when Stripe is not configured', async () => {
    expect(await stopBillingBeforeDeletion('user-1', null)).toBe(true);
  });

  it('cancels a live subscription before the account goes', async () => {
    const cancelSubscription = vi.fn().mockResolvedValue({});
    const ok = await stopBillingBeforeDeletion('user-1', {
      getSubscription: vi.fn().mockResolvedValue(row('active')),
      cancelSubscription,
    });
    expect(ok).toBe(true);
    expect(cancelSubscription.mock.calls).toEqual([['sub_1']]);
  });

  it('skips already-ended or missing subscriptions', async () => {
    const cancelSubscription = vi.fn();
    for (const value of [row('canceled'), row('active', null), null]) {
      expect(
        await stopBillingBeforeDeletion('user-1', { getSubscription: vi.fn().mockResolvedValue(value), cancelSubscription }),
      ).toBe(true);
    }
    expect(cancelSubscription.mock.calls).toEqual([]);
  });

  it('blocks deletion when Stripe refuses the cancel', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = await stopBillingBeforeDeletion('user-1', {
      getSubscription: vi.fn().mockResolvedValue(row('active')),
      cancelSubscription: vi.fn().mockRejectedValue(new Error('stripe down')),
    });
    expect(ok).toBe(false);
  });
});
