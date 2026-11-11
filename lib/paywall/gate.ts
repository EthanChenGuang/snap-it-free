/** Versioned so a redesigned flow can be shown again by bumping the suffix (v2 = Snag-modelled flow). */
export const ONBOARDING_COMPLETED_STORAGE_KEY = 'shoumanwu_onboarding_completed_v2';

/** QA / preview override: `?onboarding=1` shows the flow even after completion. */
export const ONBOARDING_FORCE_PARAM = 'onboarding';

/**
 * The `?onboarding=1` + localStorage QA stub that walks past the required account step
 * without real auth must never work in a production build. Vercel exposes `VERCEL_ENV`
 * at build time; `next.config.ts` bakes it into `NEXT_PUBLIC_VERCEL_ENV` as a literal so
 * this reads a constant in the client bundle. Anything other than 'production' (Preview,
 * local dev, undefined-local build) allows the stub; production never does.
 */
export function isAccountSkipStubAllowed(
  vercelEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV,
): boolean {
  return vercelEnv !== 'production';
}

export type OnboardingGateInput = {
  flagEnabled: boolean;
  forced: boolean;
  completed: boolean;
  /** Preview rule (Guang, 2026-11-04): a non-subscriber sees the flow on every visit, even after finishing it. */
  everyVisit?: boolean;
};

/**
 * Non-production builds (Vercel Preview, local) re-show onboarding to every non-subscriber on each
 * visit, so testing needs no `?onboarding=1`. Production keeps "once per browser".
 */
export function isOnboardingEveryVisitEnv(
  vercelEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV,
): boolean {
  return vercelEnv !== 'production';
}

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

export function shouldShowOnboarding({ flagEnabled, forced, completed, everyVisit = false }: OnboardingGateInput): boolean {
  return forced || (flagEnabled && (everyVisit || !completed));
}

/** Back from Stripe (`?checkout=…`): the locked feed shows its own "activating" notice; don't cover it. */
export function hasCheckoutReturnParam(search: string): boolean {
  return new URLSearchParams(search).has('checkout');
}

/**
 * Browser-only entry point; always false during SSR so server HTML never changes. `everyVisit` is
 * passed by the server only for a locked (non-subscriber) feed on a non-production build.
 */
export function resolveOnboardingGate(
  flagEnabled: boolean = isPaywallFlagEnabled(),
  everyVisit = false,
): boolean {
  if (typeof window === 'undefined') return false;
  return shouldShowOnboarding({
    flagEnabled,
    forced: hasOnboardingForceParam(window.location.search),
    completed: readOnboardingCompleted(window.localStorage),
    everyVisit: everyVisit && !hasCheckoutReturnParam(window.location.search),
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
