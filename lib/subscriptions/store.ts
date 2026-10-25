import { createServiceClient } from '@/lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isEntitled, type SubscriptionRow } from './entitlement';
import type { SubscriptionState } from './sync';

export type StoredSubscription = SubscriptionRow & {
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: string | null;
  cancel_at_period_end: boolean;
};

/**
 * Service-role read keyed by the server-verified user id (user JWTs are unreliable against PostgREST here).
 * `*` keeps this working before and after 043 adds past_due_since.
 */
export async function getSubscriptionForUser(userId: string): Promise<StoredSubscription | null> {
  const { data, error } = await createServiceClient()
    .from('subscriptions')
    .select('*')
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

/** Users among `userIds` whose subscription unlocks listings right now. Fails closed on a read error. */
export async function entitledUserIds(
  supabase: SupabaseClient,
  userIds: string[],
  now: Date = new Date(),
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data, error } = await supabase.from('subscriptions').select('*').in('user_id', userIds);
  if (error) {
    console.error('[paywall] entitlement lookup failed:', error.message);
    return new Set();
  }
  return new Set(
    ((data ?? []) as (SubscriptionRow & { user_id: string })[])
      .filter((row) => isEntitled(row, now))
      .map((row) => row.user_id),
  );
}
