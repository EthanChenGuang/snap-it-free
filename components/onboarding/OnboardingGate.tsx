'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { resolveOnboardingGate } from '@/lib/paywall/gate';

// Loaded only once the gate passes, so the flag-off feed ships no onboarding UI.
const OnboardingFlow = dynamic(
  () => import('@/components/onboarding/OnboardingFlow').then((mod) => mod.OnboardingFlow),
  { ssr: false },
);

/**
 * Renders nothing on the server and on first paint; the gate is checked after mount. `everyVisit`
 * re-shows the flow to a non-subscriber on each visit (non-production builds only; set by the page).
 */
export function OnboardingGate({ everyVisit = false }: { everyVisit?: boolean }) {
  const { setAutoOpenSuspended } = usePwaOnboarding();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!resolveOnboardingGate(undefined, everyVisit)) return;
    setAutoOpenSuspended(true);
    setOpen(true);
  }, [setAutoOpenSuspended, everyVisit]);

  const handleFinish = useCallback(() => {
    setOpen(false);
    setAutoOpenSuspended(false);
  }, [setAutoOpenSuspended]);

  return open ? <OnboardingFlow onFinish={handleFinish} /> : null;
}
