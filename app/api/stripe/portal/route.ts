import { NextResponse } from 'next/server';
import { PAYMENTS_DISABLED, getStripe } from '@/lib/stripe/server';
import { getSubscriptionForUser } from '@/lib/subscriptions/store';
import { requireAuth } from '@/lib/supabase/auth';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(PAYMENTS_DISABLED, { status: 503 });

  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const subscription = await getSubscriptionForUser(user.id);
  if (!subscription) return NextResponse.json({ error: 'no_subscription' }, { status: 404 });

  const session = await stripe.stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${new URL(request.url).origin}/settings`,
  });
  return NextResponse.json({ url: session.url });
}
