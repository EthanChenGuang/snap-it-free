import { createServiceClient } from '@/lib/supabase/service';
import type { SubscriptionRow } from './entitlement';
import type { SubscriptionState } from './sync';

export type StoredSubscription = SubscriptionRow & {
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: string | null;
  cancel_at_period_end: boolean;
};

/** Service-role read keyed by the server-verified user id (user JWTs are unreliable against PostgREST here). */
export async function getSubscriptionForUser(userId: string): Promise<StoredSubscription | null> {
  const { data, error } = await createServiceClient()
    .from('subscriptions')
    .select('status, current_period_end, stripe_customer_id, stripe_subscription_id, plan, cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`subscriptions read failed: ${error.message}`);
  return (data as StoredSubscription | null) ?? null;
}

export async function applySubscriptionState(state: SubscriptionState): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc('apply_subscription_state', state);
  if (error) throw new Error(`apply_subscription_state failed: ${error.message}`);
  return data === true;
}
