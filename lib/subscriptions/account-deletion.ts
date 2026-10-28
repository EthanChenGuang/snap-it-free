import type { StoredSubscription } from './store';

const ENDED = new Set(['canceled', 'incomplete_expired']);

export type CancelDeps = {
  getSubscription: (userId: string) => Promise<StoredSubscription | null>;
  cancelSubscription: (subscriptionId: string) => Promise<unknown>;
};

/**
 * Deleting an account cascades the subscriptions row, so Stripe must stop billing first.
 * Returns false when billing could not be stopped; the caller must then keep the account.
 */
export async function stopBillingBeforeDeletion(userId: string, deps: CancelDeps | null): Promise<boolean> {
  if (!deps) return true;
  try {
    const row = await deps.getSubscription(userId);
    if (!row?.stripe_subscription_id || ENDED.has(row.status)) return true;
    await deps.cancelSubscription(row.stripe_subscription_id);
    return true;
  } catch (error) {
    console.error('[stripe] could not cancel before account deletion:', error instanceof Error ? error.message : error);
    return false;
  }
}
