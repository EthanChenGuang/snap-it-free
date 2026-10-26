import { NextResponse } from 'next/server';
import { logStripeRouteError } from '@/lib/stripe/route-errors';
import { getStripe } from '@/lib/stripe/server';
import { applySubscriptionState } from '@/lib/subscriptions/store';
import { subscriptionStateFromStripe } from '@/lib/subscriptions/sync';
import { requireAuth } from '@/lib/supabase/auth';

/**
 * Stripe's success_url. Syncs the subscription right away so the user is not shown the locked
 * feed while the webhook is still in flight; the webhook later converges on the same row.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = (state: 'success' | 'pending') => NextResponse.redirect(new URL(`/?checkout=${state}`, url.origin));

  try {
    const stripe = getStripe();
    const user = await requireAuth();
    const sessionId = url.searchParams.get('session_id');
    if (!stripe || !user || !sessionId) return redirect('pending');

    const session = await stripe.stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== user.id || typeof session.subscription !== 'object' || !session.subscription) {
      return redirect('pending');
    }
    const state = subscriptionStateFromStripe(session.subscription, stripe.config.prices, new Date(), user.id);
    if (!state) return redirect('pending');
    await applySubscriptionState(state);
    return redirect('success');
  } catch (error) {
    logStripeRouteError('checkout return sync', error);
    return redirect('pending');
  }
}
