import type Stripe from 'stripe';
import type { PlanId } from '@/lib/paywall/plans';
import { planForPriceId } from '@/lib/stripe/config';

/** Arguments of `public.apply_subscription_state` (supabase/migrations/042_subscriptions.sql). */
export type SubscriptionState = {
  p_user_id: string;
  p_stripe_customer_id: string;
  p_stripe_subscription_id: string;
  p_status: string;
  p_plan: PlanId | null;
  p_price_id: string | null;
  p_current_period_end: string | null;
  p_cancel_at_period_end: boolean;
  p_last_event_at: string;
};

export type SyncDeps = {
  prices: Record<PlanId, string>;
  retrieveSubscription: (id: string) => Promise<Stripe.Subscription>;
  applyState: (state: SubscriptionState) => Promise<boolean>;
  /** Server clock; injectable for tests and the convergence check. */
  now?: () => Date;
};

export type SyncOutcome =
  | { kind: 'applied' | 'stale'; userId: string; status: string }
  | { kind: 'ignored'; reason: string };

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null);

const isoFromUnix = (seconds: number | null | undefined): string | null =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

/** user_id travels in subscription metadata, set at Checkout via subscription_data.metadata. */
export function subscriptionStateFromStripe(
  subscription: Stripe.Subscription,
  prices: Record<PlanId, string>,
  at: Date,
  fallbackUserId?: string | null,
): SubscriptionState | null {
  const userId = subscription.metadata?.user_id || fallbackUserId;
  const customerId = idOf(subscription.customer);
  if (!userId || !customerId) return null;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  return {
    p_user_id: userId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscription.id,
    p_status: subscription.status,
    p_plan: planForPriceId(prices, priceId),
    p_price_id: priceId,
    p_current_period_end: isoFromUnix(item?.current_period_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_last_event_at: at.toISOString(),
  };
}

async function apply(state: SubscriptionState | null, deps: SyncDeps): Promise<SyncOutcome> {
  if (!state) return { kind: 'ignored', reason: 'missing user_id or customer' };
  const applied = await deps.applyState(state);
  return { kind: applied ? 'applied' : 'stale', userId: state.p_user_id, status: state.p_status };
}

/**
 * Stores Stripe's current state, stamped with the time we asked for it — never the event's own time.
 * Stripe's event.created has one-second resolution and deliveries arrive in any order, so stamping with it
 * let a late same-second event overwrite a newer state (paid user stuck `incomplete`; finding F1 in
 * .claude/skills/verify-subscription-sync). The stamp is taken before the retrieve, so a later stamp
 * always reads a state at least as new. `deleted` is terminal, so its payload is already the final state.
 */
export async function handleStripeEvent(event: Stripe.Event, deps: SyncDeps): Promise<SyncOutcome> {
  const now = deps.now ?? (() => new Date());
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriptionId = idOf(session.subscription);
      if (session.mode !== 'subscription' || !subscriptionId) {
        return { kind: 'ignored', reason: 'not a subscription checkout' };
      }
      const at = now();
      const subscription = await deps.retrieveSubscription(subscriptionId);
      return apply(subscriptionStateFromStripe(subscription, deps.prices, at, session.client_reference_id), deps);
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const payload = event.data.object;
      const at = now();
      const subscription = await deps.retrieveSubscription(payload.id);
      return apply(subscriptionStateFromStripe(subscription, deps.prices, at, payload.metadata?.user_id), deps);
    }
    case 'customer.subscription.deleted':
      return apply(subscriptionStateFromStripe(event.data.object, deps.prices, now()), deps);
    default:
      return { kind: 'ignored', reason: `unhandled ${event.type}` };
  }
}
