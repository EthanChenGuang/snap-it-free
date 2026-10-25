import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { handleStripeEvent, type SubscriptionState } from './sync';

const prices = { weekly: 'price_w', monthly: 'price_m', yearly: 'price_y' };

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: 'sub_1',
    object: 'subscription',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { user_id: 'user-1' },
    items: {
      object: 'list',
      data: [{ price: { id: 'price_y' }, current_period_end: 1_824_000_000 }],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function event(type: string, object: unknown, created = 1_792_000_000): Stripe.Event {
  return { id: 'evt_1', object: 'event', type, created, data: { object } } as unknown as Stripe.Event;
}

function deps(sub = subscription(), applied = true) {
  const applyState = vi.fn<(state: SubscriptionState) => Promise<boolean>>().mockResolvedValue(applied);
  const retrieveSubscription = vi.fn().mockResolvedValue(sub);
  return { prices, applyState, retrieveSubscription };
}

describe('handleStripeEvent', () => {
  it('stores the retrieved subscription after checkout, stamped with the event time', async () => {
    const d = deps(subscription({ metadata: {} }));
    const outcome = await handleStripeEvent(
      event('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_1',
        client_reference_id: 'user-from-checkout',
      }),
      d,
    );
    expect(d.retrieveSubscription.mock.calls).toEqual([['sub_1']]);
    expect(d.applyState.mock.calls[0][0]).toEqual({
      p_user_id: 'user-from-checkout',
      p_stripe_customer_id: 'cus_1',
      p_stripe_subscription_id: 'sub_1',
      p_status: 'active',
      p_plan: 'yearly',
      p_price_id: 'price_y',
      p_current_period_end: '2027-10-20T02:40:00.000Z',
      p_cancel_at_period_end: false,
      p_last_event_at: '2026-10-14T17:46:40.000Z',
    });
    expect(outcome).toEqual({ kind: 'applied', userId: 'user-from-checkout', status: 'active' });
  });

  it('records a deletion as canceled from the event payload', async () => {
    const d = deps();
    const outcome = await handleStripeEvent(
      event('customer.subscription.deleted', subscription({ status: 'canceled' })),
      d,
    );
    expect(d.retrieveSubscription.mock.calls).toEqual([]);
    expect(d.applyState.mock.calls[0][0].p_status).toBe('canceled');
    expect(outcome).toEqual({ kind: 'applied', userId: 'user-1', status: 'canceled' });
  });

  it('reports a stale event when the database keeps a newer state', async () => {
    const d = deps(subscription(), false);
    const outcome = await handleStripeEvent(event('customer.subscription.updated', subscription()), d);
    expect(outcome).toEqual({ kind: 'stale', userId: 'user-1', status: 'active' });
  });

  it('ignores payment-mode checkouts, subscriptions without a user, and unrelated events', async () => {
    const d = deps();
    expect(await handleStripeEvent(event('checkout.session.completed', { mode: 'payment', subscription: null }), d)).toEqual({
      kind: 'ignored',
      reason: 'not a subscription checkout',
    });
    expect(await handleStripeEvent(event('customer.subscription.updated', subscription({ metadata: {} })), d)).toEqual({
      kind: 'ignored',
      reason: 'missing user_id or customer',
    });
    expect(await handleStripeEvent(event('invoice.paid', {}), d)).toEqual({ kind: 'ignored', reason: 'unhandled invoice.paid' });
    expect(d.applyState.mock.calls).toEqual([]);
  });
});
