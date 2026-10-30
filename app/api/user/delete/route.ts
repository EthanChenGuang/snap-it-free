import { NextResponse } from 'next/server';
import { deleteAccountData } from '@/lib/account/delete-account';
import { getStripe } from '@/lib/stripe/server';
import { stopBillingBeforeDeletion } from '@/lib/subscriptions/account-deletion';
import { getSubscriptionForUser } from '@/lib/subscriptions/store';
import { requireAuth } from '@/lib/supabase/auth';
import { restErrorResponse } from '@/lib/supabase/rest-error';
import { withRestRetry } from '@/lib/supabase/rest-retry';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { count, error } = await withRestRetry(() =>
    serviceClient
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', user.id)
      .eq('status', 'claimed'),
  );

  if (error) {
    return restErrorResponse(error, { fallbackStatus: 500 });
  }

  return NextResponse.json({ activeClaims: count ?? 0 });
}

export async function POST() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const billingStopped = await stopBillingBeforeDeletion(
    user.id,
    stripe && {
      getSubscription: getSubscriptionForUser,
      cancelSubscription: (id) => stripe.stripe.subscriptions.cancel(id),
    },
  );
  if (!billingStopped) {
    return NextResponse.json({ error: 'subscription_cancel_failed' }, { status: 502 });
  }

  const serviceClient = createServiceClient();
  const result = await deleteAccountData(serviceClient, user.id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
