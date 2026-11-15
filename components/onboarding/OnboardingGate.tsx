'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { FILTER_PREFS_STORAGE_KEY } from '@/lib/filter-prefs/storage';
import {
  hasOnboardingForceParam,
  isFreeOnboarding,
  markOnboardingCompleted,
  resolveOnboardingGate,
} from '@/lib/paywall/gate';

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
  const { user, loading } = useAuthSession();

  useEffect(() => {
    if (open || !resolveOnboardingGate(undefined, everyVisit)) return;
    // Free onboarding is for first-time visitors: a browser that already has a session or saved feed
    // filters belongs to an existing user, who must not be walked through it or have filters overwritten.
    // `?onboarding=1` still forces it. Paid mode keeps today's behaviour.
    if (isFreeOnboarding() && !hasOnboardingForceParam(window.location.search)) {
      let hasSavedFilters = false;
      try {
        hasSavedFilters = window.localStorage.getItem(FILTER_PREFS_STORAGE_KEY) !== null;
      } catch {
        // Storage blocked: treat as a first-time visitor.
      }
      if (!hasSavedFilters) {
        // getSession is local, so this settles at once; show nothing until it has, so a signed-in user sees no flash.
        if (loading) return;
        if (!user) {
          setAutoOpenSuspended(true);
          setOpen(true);
          return;
        }
      }
      markOnboardingCompleted(window.localStorage);
      return;
    }
    setAutoOpenSuspended(true);
    setOpen(true);
  }, [setAutoOpenSuspended, everyVisit, loading, user, open]);

  const handleFinish = useCallback(() => {
    setOpen(false);
    setAutoOpenSuspended(false);
  }, [setAutoOpenSuspended]);

  return open ? <OnboardingFlow onFinish={handleFinish} /> : null;
}
