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

/** Refetches the subscription so every path stores Stripe's current state, stamped with the event time. */
export async function handleStripeEvent(event: Stripe.Event, deps: SyncDeps): Promise<SyncOutcome> {
  const at = new Date(event.created * 1000);
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriptionId = idOf(session.subscription);
      if (session.mode !== 'subscription' || !subscriptionId) {
        return { kind: 'ignored', reason: 'not a subscription checkout' };
      }
      const subscription = await deps.retrieveSubscription(subscriptionId);
      return apply(subscriptionStateFromStripe(subscription, deps.prices, at, session.client_reference_id), deps);
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // The payload is the state at event time, which is what last_event_at orders by.
      return apply(subscriptionStateFromStripe(event.data.object, deps.prices, at), deps);
    default:
      return { kind: 'ignored', reason: `unhandled ${event.type}` };
  }
}
