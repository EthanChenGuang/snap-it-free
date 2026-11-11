'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { applyCheckoutReturnChoices, parseCheckoutParam } from '@/lib/paywall/checkout-return';

/**
 * Stripe return: persist onboarding answers and mark the flow done so the overlay does not
 * reopen. Toast / pending copy live on the feed surfaces that know whether access is open.
 */
function CheckoutReturnFromUrlInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = parseCheckoutParam(searchParams.toString());
    if (checkout !== 'success' && checkout !== 'pending') return;

    applyCheckoutReturnChoices(window.localStorage, window.sessionStorage);
  }, [searchParams]);

  return null;
}

export function CheckoutReturnFromUrl() {
  return (
    <Suspense fallback={null}>
      <CheckoutReturnFromUrlInner />
    </Suspense>
  );
}
