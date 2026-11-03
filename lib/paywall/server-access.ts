import { isForceParamValue, isPaywallFlagEnabled, resolveListingAccess, type ListingAccess } from './gate';

type SearchParams = Record<string, string | string[] | undefined>;

/** Seam for Part 2: replaced by a read of the `subscriptions` table for the signed-in user. */
export async function getSubscriptionActive(): Promise<boolean> {
  return false;
}

/** Flag off and no preview returns before any I/O, so the ungated path is unchanged. */
export async function getListingAccess(searchParams: SearchParams = {}): Promise<ListingAccess> {
  const flagEnabled = isPaywallFlagEnabled();
  const preview = isForceParamValue(searchParams.onboarding);
  if (!flagEnabled && !preview) return 'open';
  return resolveListingAccess({ flagEnabled, preview, subscribed: await getSubscriptionActive() });
}
