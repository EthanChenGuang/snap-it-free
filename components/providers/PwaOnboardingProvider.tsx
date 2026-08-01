'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IosInstallGuide } from '@/components/pwa/IosInstallGuide';
import { createClient } from '@/lib/supabase/client';
import {
  isIOS,
  isIosPushDismissed,
  isStandalonePwa,
  markIosGuideShownThisSession,
  needsIosInstallGuide,
  wasIosGuideShownThisSession,
} from '@/lib/pwa/ios-detect';

type PwaOnboardingContextValue = {
  openInstallGuide: () => void;
  isDismissed: boolean;
  needsInstall: boolean;
};

const PwaOnboardingContext = createContext<PwaOnboardingContextValue | null>(null);

export function usePwaOnboarding(): PwaOnboardingContextValue {
  const ctx = useContext(PwaOnboardingContext);
  if (!ctx) {
    throw new Error('usePwaOnboarding must be used within PwaOnboardingProvider');
  }
  return ctx;
}

export function PwaOnboardingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [guideOpen, setGuideOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const needsInstall = needsIosInstallGuide();

  useEffect(() => {
    setDismissed(isIosPushDismissed());
  }, [guideOpen]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (
      pathname !== '/settings' ||
      !isLoggedIn ||
      !isIOS() ||
      isStandalonePwa() ||
      isIosPushDismissed() ||
      wasIosGuideShownThisSession()
    ) {
      return;
    }

    markIosGuideShownThisSession();
    setGuideOpen(true);
  }, [pathname, isLoggedIn]);

  const openInstallGuide = useCallback(() => {
    if (needsIosInstallGuide()) {
      setGuideOpen(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const value = useMemo(
    () => ({
      openInstallGuide,
      isDismissed: dismissed,
      needsInstall,
    }),
    [openInstallGuide, dismissed, needsInstall],
  );

  return (
    <PwaOnboardingContext.Provider value={value}>
      {children}
      <IosInstallGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onDismiss={handleDismiss}
      />
    </PwaOnboardingContext.Provider>
  );
}
