'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  // The flow opens at most once per mount: `everyVisit` keeps the gate true after it finishes, so without this a
  // later re-run of the effect (session change) would reopen it right after the user closed it.
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current || !resolveOnboardingGate(undefined, everyVisit)) return;
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
          openedRef.current = true;
          setAutoOpenSuspended(true);
          setOpen(true);
          return;
        }
      }
      markOnboardingCompleted(window.localStorage);
      return;
    }
    openedRef.current = true;
    setAutoOpenSuspended(true);
    setOpen(true);
  }, [setAutoOpenSuspended, everyVisit, loading, user]);

  const handleFinish = useCallback(() => {
    setOpen(false);
    setAutoOpenSuspended(false);
  }, [setAutoOpenSuspended]);

  return open ? <OnboardingFlow onFinish={handleFinish} /> : null;
}
