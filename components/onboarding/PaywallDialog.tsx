'use client';

import { useEffect, useRef, useState } from 'react';
import { OverlayShell } from '@/components/onboarding/OverlayShell';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';
import type { OnboardingState } from '@/lib/paywall/onboarding-flow';

const TITLE_ID = 'paywall-title';

/** The paywall on its own, opened from a locked view after onboarding is done. */
export function PaywallDialog({ onClose }: { onClose: () => void }) {
  const [purchase, setPurchase] = useState<OnboardingState['purchase']>('idle');
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [purchase]);

  return (
    <OverlayShell labelledBy={TITLE_ID} testId="paywall-dialog" screen="paywall">
      <PaywallScreen
        purchase={purchase}
        titleRef={titleRef}
        titleId={TITLE_ID}
        onStartPurchase={() => setPurchase('comingSoon')}
        onFinish={onClose}
      />
    </OverlayShell>
  );
}
