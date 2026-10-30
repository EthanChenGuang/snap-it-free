import type { PlanId } from './plans';

/**
 * Remembers the plan a signed-out user tapped before a Google redirect, so checkout resumes on return
 * instead of dropping them back on a locked page. Session-scoped and short-lived; `source` keeps the
 * onboarding paywall and the locked-view paywall from both resuming the same checkout.
 */
export const PENDING_CHECKOUT_KEY = 'shoumanwu_pending_checkout_v1';
const MAX_AGE_MS = 30 * 60 * 1000;

export type CheckoutSource = 'onboarding' | 'locked';
type PendingCheckout = { plan: PlanId; source: CheckoutSource; at: number };

const PLANS: readonly PlanId[] = ['weekly', 'monthly', 'yearly'];

export function savePendingCheckout(storage: Storage, plan: PlanId, source: CheckoutSource, now = Date.now()): void {
  try {
    storage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ plan, source, at: now } satisfies PendingCheckout));
  } catch {
    // Storage unavailable: the user simply taps the CTA again after signing in.
  }
}

/** Returns the pending plan for this source (and clears it), or null if none, stale or for another source. */
export function takePendingCheckout(storage: Storage, source: CheckoutSource, now = Date.now()): PlanId | null {
  try {
    const raw = storage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCheckout>;
    if (parsed.source !== source) return null;
    storage.removeItem(PENDING_CHECKOUT_KEY);
    if (typeof parsed.at !== 'number' || now - parsed.at > MAX_AGE_MS) return null;
    return PLANS.includes(parsed.plan as PlanId) ? (parsed.plan as PlanId) : null;
  } catch {
    return null;
  }
}

/** True when a pending checkout for this source is waiting (does not consume it). */
export function hasPendingCheckout(storage: Storage, source: CheckoutSource, now = Date.now()): boolean {
  try {
    const raw = storage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<PendingCheckout>;
    return parsed.source === source && typeof parsed.at === 'number' && now - parsed.at <= MAX_AGE_MS;
  } catch {
    return false;
  }
}
