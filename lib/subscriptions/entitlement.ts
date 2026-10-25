export type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
  /** Added by migration 043; absent on rows read before it is applied. */
  past_due_since?: string | null;
};

/** Must match public.has_active_subscription() in supabase/migrations/044_listings_paywall_rls.sql. */
export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const ENTITLED_STATUSES = new Set(['active', 'trialing']);

/**
 * active/trialing with the period not ended, or past_due for less than 3 days. The grace window starts
 * when past_due began, not at current_period_end: Stripe advances the period on the renewal attempt,
 * so a failed renewal already carries the next period's end. Without past_due_since (before 043), no grace.
 */
export function isEntitled(row: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!row) return false;
  if (ENTITLED_STATUSES.has(row.status)) {
    return row.current_period_end === null || new Date(row.current_period_end).getTime() > now.getTime();
  }
  if (row.status === 'past_due' && row.past_due_since) {
    return now.getTime() < new Date(row.past_due_since).getTime() + PAST_DUE_GRACE_MS;
  }
  return false;
}
