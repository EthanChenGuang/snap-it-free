import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { PAYMENTS_DISABLED, getStripe } from '@/lib/stripe/server';
import { applySubscriptionState } from '@/lib/subscriptions/store';
import { handleStripeEvent } from '@/lib/subscriptions/sync';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(PAYMENTS_DISABLED, { status: 503 });

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  // Signature verification needs the exact bytes Stripe sent, so read text, not JSON.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.stripe.webhooks.constructEvent(payload, signature, stripe.config.webhookSecret);
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(event, {
      prices: stripe.config.prices,
      retrieveSubscription: (id) => stripe.stripe.subscriptions.retrieve(id),
      applyState: applySubscriptionState,
    });
    return NextResponse.json({ received: true, outcome: outcome.kind });
  } catch (error) {
    // Non-2xx makes Stripe retry; apply_subscription_state makes the retry safe.
    console.error(`[stripe] webhook ${event.type} failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }
}
