'use client';

import { useState } from 'react';
import { SettingsGroupCard } from '@/components/settings/SettingsUi';
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
    <section className="mb-6">
      <SettingsGroupCard className="border border-error/30 bg-error-container/20 p-4">
        <h3 className="text-body-md font-bold text-error">{messages.settings.advanced.title}</h3>
        <p className="mb-4 text-label-sm text-secondary">{messages.settings.advanced.description}</p>
        <button
          type="button"
          onClick={handleReset}
          onBlur={() => setConfirming(false)}
          className="rounded-xl border border-error bg-surface-container-lowest px-4 py-2 text-label-md text-error transition-colors active:bg-error active:text-on-error"
        >
          {confirming ? messages.settings.advanced.confirmReset : messages.settings.advanced.resetButton}
        </button>
      </SettingsGroupCard>
    </section>
  );
}
