/** Versioned so a redesigned flow can be shown again by bumping the suffix (v2 = Snag-modelled flow). */
export const ONBOARDING_COMPLETED_STORAGE_KEY = 'shoumanwu_onboarding_completed_v2';

/** QA / preview override: `?onboarding=1` shows the flow even after completion. */
export const ONBOARDING_FORCE_PARAM = 'onboarding';

export type OnboardingGateInput = {
  flagEnabled: boolean;
  forced: boolean;
  completed: boolean;
};

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

// Read as a literal so Next.js inlines it at build time.
export function isPaywallFlagEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_PAYWALL_ENABLED,
): boolean {
  return value === 'true';
}

/** `?onboarding=1` forces the flow for QA; `?onboarding=resume` is our own return URL after the
 * account step's auth redirect, so the flow re-opens to finish. Both re-open onboarding. */
export function hasOnboardingForceParam(search: string): boolean {
  const value = new URLSearchParams(search).get(ONBOARDING_FORCE_PARAM);
  return value === '1' || value === 'resume';
}

export function isOnboardingResumeParam(search: string): boolean {
  return new URLSearchParams(search).get(ONBOARDING_FORCE_PARAM) === 'resume';
}

export function readOnboardingCompleted(storage: ReadableStorage | undefined): boolean {
  try {
    return storage?.getItem(ONBOARDING_COMPLETED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(storage: WritableStorage | undefined): void {
  try {
    storage?.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, '1');
  } catch {
    // Private mode / quota: the flow simply shows again next visit.
  }
}

export function shouldShowOnboarding({ flagEnabled, forced, completed }: OnboardingGateInput): boolean {
  return forced || (flagEnabled && !completed);
}

/** Browser-only entry point; always false during SSR so server HTML never changes. */
export function resolveOnboardingGate(
  flagEnabled: boolean = isPaywallFlagEnabled(),
): boolean {
  if (typeof window === 'undefined') return false;
  return shouldShowOnboarding({
    flagEnabled,
    forced: hasOnboardingForceParam(window.location.search),
    completed: readOnboardingCompleted(window.localStorage),
  });
}

/** Drops `?onboarding=1` after finishing so a reload lands on the plain feed. */
export function urlWithoutForceParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(ONBOARDING_FORCE_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export type ListingAccess = 'open' | 'locked';

export type ListingAccessInput = {
  flagEnabled: boolean;
  /** `?onboarding=1` previews the hard gate for QA even with the flag off. */
  preview: boolean;
  subscribed: boolean;
};

/** Hard paywall: once enabled (or previewed), real listings need an active subscription. */
export function resolveListingAccess({ flagEnabled, preview, subscribed }: ListingAccessInput): ListingAccess {
  if (!flagEnabled && !preview) return 'open';
  return subscribed ? 'open' : 'locked';
}

export function isForceParamValue(value: string | string[] | undefined): boolean {
  return value === '1';
}
