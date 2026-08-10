'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsCard, SettingsSectionTitle } from '@/components/settings/SettingsUi';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { FAVORITES_CHANGE_EVENT } from '@/lib/favorites/storage';
import { useMessages } from '@/lib/i18n/useMessages';
import { resetLocalAppData } from '@/lib/settings/preferences';
import { REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import { createClient } from '@/lib/supabase/client';

export function AccountSection() {
  const { messages } = useMessages();
  const { user } = useAuthSession();
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [activeClaims, setActiveClaims] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    void fetch('/api/user/delete')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { activeClaims?: number } | null) => {
        if (data && typeof data.activeClaims === 'number') {
          setActiveClaims(data.activeClaims);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/user/delete', { method: 'POST' });

      if (!res.ok) {
        setError(messages.settings.account.deleteError);
        setConfirming(false);
        setDeleting(false);
        return;
      }

      resetLocalAppData();
      window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: [] }));
      window.dispatchEvent(new CustomEvent(REPORTS_CHANGE_EVENT, { detail: [] }));
      await createClient().auth.signOut();
      router.push('/');
    } catch {
      setError(messages.settings.account.deleteError);
      setConfirming(false);
      setDeleting(false);
    }
  };

  return (
    <section className="pb-space-xl">
      <SettingsSectionTitle>{messages.settings.account.sectionTitle}</SettingsSectionTitle>
      <SettingsCard className="border-error/20 bg-error-container/30 p-space-md">
        <h3 className="text-body-md font-bold text-error">{messages.settings.account.deleteTitle}</h3>
        <p className="mb-space-md text-label-sm text-secondary">
          {messages.settings.account.deleteDescription}
        </p>
        {activeClaims > 0 && (
          <p className="mb-space-md text-label-sm text-error">
            {messages.settings.account.activeClaimsWarning(activeClaims)}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleDelete()}
          onBlur={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-lg border border-error bg-surface-container-lowest px-space-md py-space-xs text-label-md text-error transition-all hover:bg-error hover:text-on-error"
        >
          {confirming ? messages.settings.account.confirmDelete : messages.settings.account.deleteButton}
        </button>
        {error && <p className="mt-space-xs text-label-sm text-error">{error}</p>}
      </SettingsCard>
    </section>
  );
}
