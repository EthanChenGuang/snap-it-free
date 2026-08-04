'use client';

import { useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsUi';
import { resetLocalAppData } from '@/lib/settings/preferences';
import { FAVORITES_CHANGE_EVENT } from '@/lib/favorites/storage';
import { REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import { useMessages } from '@/lib/i18n/useMessages';

export function AdvancedSection() {
  const { messages } = useMessages();

  const [confirming, setConfirming] = useState(false);

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    resetLocalAppData();
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: [] }));
    window.dispatchEvent(new CustomEvent(REPORTS_CHANGE_EVENT, { detail: [] }));
    setConfirming(false);
  };

  return (
    <section className="pb-space-xl">
      <SettingsCard className="border-error/20 bg-error-container/30 p-space-md">
        <h3 className="text-body-md font-bold text-error">{messages.settings.advanced.title}</h3>
        <p className="mb-space-md text-label-sm text-secondary">{messages.settings.advanced.description}</p>
        <button
          type="button"
          onClick={handleReset}
          onBlur={() => setConfirming(false)}
          className="rounded-lg border border-error bg-surface-container-lowest px-space-md py-space-xs text-label-md text-error transition-all hover:bg-error hover:text-on-error"
        >
          {confirming ? messages.settings.advanced.confirmReset : messages.settings.advanced.resetButton}
        </button>
      </SettingsCard>
    </section>
  );
}
