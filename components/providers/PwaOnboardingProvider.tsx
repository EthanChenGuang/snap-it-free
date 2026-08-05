'use client';

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { isIosPushDismissed, needsIosInstallGuide } from '@/lib/pwa/ios-detect';

// Split for the same reason as IosGuideAutoOpen below: the guide drags the radix
// dialog/drawer stack into app/layout.js, and an oversized layout chunk gets
// truncated by the dev server mid-transfer, which kills hydration.
const IosInstallGuide = dynamic(
  () => import('@/components/pwa/IosInstallGuide').then((mod) => mod.IosInstallGuide),
  { ssr: false },
);

// The context itself stays in the layout chunk — consumers call usePwaOnboarding()
// and it throws when the provider is absent. Only the auth-dependent auto-open
// effect is split out, which is what keeps the Supabase SDK out of app/layout.js.
const IosGuideAutoOpen = dynamic(
  () => import('@/components/pwa/IosGuideAutoOpen').then((mod) => mod.IosGuideAutoOpen),
  { ssr: false },
);

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
  const [guideOpen, setGuideOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const needsInstall = needsIosInstallGuide();

  useEffect(() => {
    setDismissed(isIosPushDismissed());
  }, [guideOpen]);

  const openInstallGuide = useCallback(() => {
    if (needsIosInstallGuide()) {
      setGuideOpen(true);
    }
  }, []);

  const handleAutoOpen = useCallback(() => {
    setGuideOpen(true);
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
      <IosGuideAutoOpen onOpen={handleAutoOpen} />
      <IosInstallGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onDismiss={handleDismiss}
      />
    </PwaOnboardingContext.Provider>
  );
}
