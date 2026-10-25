'use client';

import { OverlayShell } from '@/components/onboarding/OverlayShell';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';

const TITLE_ID = 'paywall-title';

/** The paywall on its own, opened from a locked view after onboarding is done. */
export function PaywallDialog({ onClose }: { onClose: () => void }) {
  return (
    <OverlayShell labelledBy={TITLE_ID} testId="paywall-dialog" screen="paywall">
      <PaywallScreen titleId={TITLE_ID} onFinish={onClose} />
    </OverlayShell>
  );
}
