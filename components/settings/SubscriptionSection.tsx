'use client';

import { useEffect, useState } from 'react';
import { SettingsChevron, SettingsGroupCard, SettingsSectionTitle } from '@/components/settings/SettingsUi';
import { useMessages } from '@/lib/i18n/useMessages';

type SubscriptionStatus = {
  configured: boolean;
  active: boolean;
  hasCustomer: boolean;
  plan: 'weekly' | 'monthly' | 'yearly' | null;
  cancelAtPeriodEnd: boolean;
};

/** Shown only to users with a Stripe customer; opens the Stripe Customer Portal. */
export function SubscriptionSection() {
  const { messages } = useMessages();
  const copy = messages.subscription;
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch('/api/subscription', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SubscriptionStatus | null) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  if (!status?.configured || !status.hasCustomer) return null;

  const planLabel = status.plan
    ? { weekly: messages.paywall.planWeekly, monthly: messages.paywall.planMonthly, yearly: messages.paywall.planYearly }[status.plan]
    : null;

  const openPortal = async () => {
    setOpening(true);
    setError(false);
    const res = await fetch('/api/stripe/portal', { method: 'POST' }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { url?: string } | null;
    if (res?.ok && body?.url?.startsWith('https://')) {
      window.location.assign(body.url);
      return;
    }
    setError(true);
    setOpening(false);
  };

  return (
    <section className="mb-6" data-testid="settings-subscription">
      <SettingsSectionTitle>{copy.sectionTitle}</SettingsSectionTitle>
      <SettingsGroupCard>
        <button
          type="button"
          onClick={() => void openPortal()}
          disabled={opening}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span>
            <span className="block text-body-md text-on-surface">{copy.manage}</span>
            <span className="block text-label-sm text-on-surface-variant">
              {status.active && planLabel ? copy.active(planLabel) : copy.inactive}
              {status.active && status.cancelAtPeriodEnd ? ` · ${copy.endsAtPeriodEnd}` : ''}
            </span>
          </span>
          <SettingsChevron />
        </button>
      </SettingsGroupCard>
      {error && (
        <p role="alert" className="px-4 text-label-sm text-error" data-testid="settings-portal-error">
          {copy.portalError}
        </p>
      )}
    </section>
  );
}
