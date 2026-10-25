export type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
};

const ENTITLED_STATUSES = new Set(['active', 'trialing']);

/** past_due, unpaid, incomplete and canceled do not unlock listings. */
export function isEntitled(row: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!row || !ENTITLED_STATUSES.has(row.status)) return false;
  return row.current_period_end === null || new Date(row.current_period_end).getTime() > now.getTime();
}
