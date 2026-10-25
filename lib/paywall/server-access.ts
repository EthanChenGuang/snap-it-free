import { requireAuth } from '@/lib/supabase/auth';
import { isEntitled } from '@/lib/subscriptions/entitlement';
import { getSubscriptionForUser } from '@/lib/subscriptions/store';
import { isForceParamValue, isPaywallFlagEnabled, resolveListingAccess, type ListingAccess } from './gate';

type SearchParams = Record<string, string | string[] | undefined>;

/** Fails closed: no session, no row, or a read error all mean locked. */
export async function getSubscriptionActive(): Promise<boolean> {
  try {
    const user = await requireAuth();
    if (!user) return false;
    return isEntitled(await getSubscriptionForUser(user.id));
  } catch (error) {
    console.error('[paywall] subscription check failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/** Flag off and no preview returns before any I/O, so the ungated path is unchanged. */
export async function getListingAccess(searchParams: SearchParams = {}): Promise<ListingAccess> {
  const flagEnabled = isPaywallFlagEnabled();
  const preview = isForceParamValue(searchParams.onboarding);
  if (!flagEnabled && !preview) return 'open';
  return resolveListingAccess({ flagEnabled, preview, subscribed: await getSubscriptionActive() });
}
