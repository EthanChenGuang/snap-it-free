import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PAYMENTS_DISABLED, getStripe } from '@/lib/stripe/server';
import { isEntitled } from '@/lib/subscriptions/entitlement';
import { getSubscriptionForUser } from '@/lib/subscriptions/store';
import { requireAuth } from '@/lib/supabase/auth';

const CheckoutBody = z.object({ plan: z.enum(['weekly', 'monthly', 'yearly']) });

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(PAYMENTS_DISABLED, { status: 503 });

  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const parsed = CheckoutBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });

  const existing = await getSubscriptionForUser(user.id);
  if (isEntitled(existing)) return NextResponse.json({ error: 'already_subscribed' }, { status: 409 });

  const origin = new URL(request.url).origin;
  const session = await stripe.stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: stripe.config.prices[parsed.data.plan], quantity: 1 }],
    // Reuse the customer from an earlier (lapsed) subscription; otherwise Checkout creates one.
    ...(existing ? { customer: existing.stripe_customer_id } : { customer_email: user.email ?? undefined }),
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/api/stripe/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancel`,
  });

  if (!session.url) return NextResponse.json({ error: 'checkout_unavailable' }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
