import type { PlanId } from './plans';

/** What the paywall shows after the CTA. `comingSoon` is the no-Stripe-env state. */
export type PurchaseState = 'idle' | 'pending' | 'comingSoon' | 'signInRequired' | 'alreadySubscribed' | 'error';

export type CheckoutOutcome =
  | { kind: 'redirect'; url: string }
  | { kind: 'show'; state: Exclude<PurchaseState, 'idle' | 'pending'> };

export function checkoutOutcome(status: number, body: unknown): CheckoutOutcome {
  const url = (body as { url?: unknown } | null)?.url;
  if (status === 200 && typeof url === 'string' && url.startsWith('https://')) return { kind: 'redirect', url };
  if (status === 503) return { kind: 'show', state: 'comingSoon' };
  if (status === 401) return { kind: 'show', state: 'signInRequired' };
  // Already subscribed: say so and offer the feed. (A bare reload looped inside a forced onboarding.)
  if (status === 409) return { kind: 'show', state: 'alreadySubscribed' };
  return { kind: 'show', state: 'error' };
}

export type RestoreOutcome = 'reload' | 'nothing' | 'signIn';

export function restoreOutcome(body: unknown): RestoreOutcome {
  const status = body as { signedIn?: unknown; active?: unknown } | null;
  if (status?.active === true) return 'reload';
  return status?.signedIn === true ? 'nothing' : 'signIn';
}

export async function startCheckout(plan: PlanId): Promise<CheckoutOutcome> {
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    return checkoutOutcome(res.status, await res.json().catch(() => null));
  } catch {
    return { kind: 'show', state: 'error' };
  }
}

export async function checkRestore(): Promise<RestoreOutcome> {
  try {
    const res = await fetch('/api/subscription', { cache: 'no-store' });
    return restoreOutcome(await res.json());
  } catch {
    return 'nothing';
  }
}
