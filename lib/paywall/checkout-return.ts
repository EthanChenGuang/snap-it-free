import { readFilterPrefs, writeFilterPrefs } from '@/lib/filter-prefs/storage';
import { markOnboardingCompleted, type ListingAccess } from './gate';
import { clearResumeState, readResumeState } from './onboarding-flow';
import { onboardingFilterPrefs } from './onboarding-interests';

export type CheckoutParam = 'success' | 'pending' | 'cancel' | null;

export type CheckoutReturnNotice = 'success' | 'pending';

/** Stripe sends the user home with `?checkout=success|pending|cancel`. Anything else is ignored. */
export function parseCheckoutParam(search: string): CheckoutParam {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('checkout');
  if (value === 'success' || value === 'pending' || value === 'cancel') return value;
  return null;
}

/**
 * What to show after Checkout returns.
 * Unlocked → "You're in" (the feed is actually open, even if the return route said pending).
 * Locked → keep the existing "activation can take a minute" notice. Never toast success while locked.
 * Cancel is a no-op.
 */
export function checkoutReturnNotice(
  access: ListingAccess,
  checkout: CheckoutParam,
): CheckoutReturnNotice | null {
  if (checkout !== 'success' && checkout !== 'pending') return null;
  return access === 'open' ? 'success' : 'pending';
}

export function urlWithoutCheckoutParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('checkout');
  return `${url.pathname}${url.search}${url.hash}`;
}

type WebStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Mark onboarding done and apply quiz answers so the unlocked feed opens with city / interests / radius. */
export function applyCheckoutReturnChoices(
  localStorageRef: WebStorage | undefined,
  sessionStorageRef: WebStorage | undefined,
): void {
  markOnboardingCompleted(localStorageRef);
  const resume = readResumeState(sessionStorageRef);
  if (!resume) return;
  writeFilterPrefs(
    onboardingFilterPrefs(readFilterPrefs(), {
      city: resume.city,
      interests: resume.interests,
      radiusKm: resume.radiusKm,
      locationGranted: resume.locationGranted,
    }),
  );
  clearResumeState(sessionStorageRef);
}
