'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type SwitchAccountButtonProps = {
  /** Runs after the local session is gone, so the caller can show its sign-in options again. */
  onSignedOut?: () => void;
  className?: string;
  testId: string;
};

/**
 * "Not you? Use another account": signs out on this device only (other devices keep their session),
 * so someone on a shared phone, or signed in with the wrong Google account, can switch before paying.
 */
export function SwitchAccountButton({ onSignedOut, className, testId }: SwitchAccountButtonProps) {
  const { messages } = useMessages();
  const copy = messages.onboarding.account;
  const [busy, setBusy] = useState(false);

  const switchAccount = async () => {
    setBusy(true);
    try {
      await createClient().auth.signOut({ scope: 'local' });
    } finally {
      setBusy(false);
      onSignedOut?.();
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void switchAccount()}
      className={cn(
        'min-h-9 text-label-sm font-semibold text-[#1A1A2E] underline underline-offset-2 disabled:opacity-60',
        className,
      )}
      data-testid={testId}
    >
      {busy ? copy.switchingAccount : copy.switchAccount}
    </button>
  );
}
