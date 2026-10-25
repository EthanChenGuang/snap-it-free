import { NextResponse } from 'next/server';
import { readStripeConfig } from '@/lib/stripe/config';
import { isEntitled } from '@/lib/subscriptions/entitlement';
import { getSubscriptionForUser } from '@/lib/subscriptions/store';
import { requireAuth } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

/** What the paywall and Settings need: is billing on, and does this user have an active plan. */
export async function GET() {
  const configured = readStripeConfig().enabled;
  const user = await requireAuth().catch(() => null);
  if (!user) return NextResponse.json({ configured, signedIn: false, active: false, hasCustomer: false });

  const row = await getSubscriptionForUser(user.id).catch(() => null);
  return NextResponse.json({
    configured,
    signedIn: true,
    active: isEntitled(row),
    hasCustomer: Boolean(row),
    plan: row?.plan ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
  });
}
