'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsGroupCard, SettingsSectionTitle } from '@/components/settings/SettingsUi';
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
    <section className="mb-6">
      <SettingsSectionTitle>{messages.settings.account.sectionTitle}</SettingsSectionTitle>
      <SettingsGroupCard className="border border-error/20 bg-error-container/30 p-4">
        <h3 className="text-body-md font-bold text-error">{messages.settings.account.deleteTitle}</h3>
        <p className="mb-4 text-label-sm text-secondary">
          {messages.settings.account.deleteDescription}
        </p>
        {activeClaims > 0 && (
          <p className="mb-4 text-label-sm text-error">
            {messages.settings.account.activeClaimsWarning(activeClaims)}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleDelete()}
          onBlur={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-xl border border-error bg-surface-container-lowest px-4 py-2 text-label-md text-error transition-colors active:bg-error active:text-on-error"
        >
          {confirming ? messages.settings.account.confirmDelete : messages.settings.account.deleteButton}
        </button>
        {error && <p className="mt-2 text-label-sm text-error">{error}</p>}
      </SettingsGroupCard>
    </section>
  );
}
