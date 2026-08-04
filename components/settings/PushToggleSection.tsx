'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { Button } from '@/components/ui/button';
import {
  canOfferPush,
  canRequestPushPermission,
  isIOS,
  isIosPushDismissed,
  isStandalonePwa,
} from '@/lib/pwa/ios-detect';
import {
  getPushSubscriptionActive,
  requestPushPermissionAndSubscribe,
  unsubscribePush,
} from '@/lib/pwa/usePushSubscribe';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type PushToggleSectionProps = {
  isLoggedIn: boolean;
};

function PushToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const { messages } = useMessages();
  return (
    <label className={cn('relative inline-flex cursor-pointer items-center', disabled && 'opacity-50')}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={enabled}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={
          enabled ? messages.settings.push.enabledLabel : messages.settings.push.disabledLabel
        }
      />
      <span className="h-5 w-10 rounded-full bg-secondary-fixed peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-outline after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-outline-variant after:bg-surface-container-lowest after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );
}

export function PushToggleSection({ isLoggedIn }: PushToggleSectionProps) {
  const { messages } = useMessages();

  const { openInstallGuide } = usePwaOnboarding();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const iosNonStandalone = isIOS() && !isStandalonePwa();
  const iosDismissed = isIosPushDismissed();
  const pushSupported = canOfferPush();
  const canSubscribe =
    isLoggedIn &&
    pushSupported &&
    Boolean(vapidPublicKey) &&
    canRequestPushPermission(isLoggedIn);

  const disabledReason = !pushSupported
    ? messages.settings.push.unsupported
    : !vapidPublicKey
      ? messages.settings.push.vapidMissing
      : iosNonStandalone && iosDismissed
        ? messages.settings.push.iosInstallRequired
        : null;

  const refreshSubscription = useCallback(async () => {
    if (!canSubscribe) {
      setLoading(false);
      return;
    }

    try {
      const active = await getPushSubscriptionActive();
      setEnabled(active);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [canSubscribe]);

  useEffect(() => {
    if (!isLoggedIn) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    void refreshSubscription();
  }, [isLoggedIn, refreshSubscription]);

  const handleToggle = async (nextEnabled: boolean) => {
    if (!isLoggedIn || busy) return;

    if (iosNonStandalone && !iosDismissed) {
      openInstallGuide();
      return;
    }

    if (!canSubscribe || disabledReason) return;

    setBusy(true);
    setError(null);

    try {
      if (nextEnabled) {
        const result = await requestPushPermissionAndSubscribe();
        if (!result.ok) {
          if (result.reason === 'ios_not_ready') {
            openInstallGuide();
          } else if (result.reason === 'permission_denied') {
            setError(messages.settings.push.permissionDenied);
          } else if (result.reason === 'vapid_missing') {
            setError(messages.settings.push.vapidMissing);
          } else {
            setError(messages.settings.push.subscribeError);
          }
          return;
        }
        setEnabled(true);
      } else {
        const ok = await unsubscribePush();
        if (!ok) {
          setError(messages.settings.push.subscribeError);
          return;
        }
        setEnabled(false);
      }
    } catch {
      setError(messages.settings.push.subscribeError);
    } finally {
      setBusy(false);
    }
  };

  const showInstallCta = iosNonStandalone && !iosDismissed;
  const toggleDisabled = !isLoggedIn || Boolean(disabledReason) || loading || busy || showInstallCta;

  return (
    <div className="border-t border-outline-variant p-space-md">
      <div className="flex items-center justify-between gap-space-md">
        <div className="min-w-0 flex-1">
          <p className="text-body-md font-medium text-on-surface">{messages.settings.push.title}</p>
          <p className="text-label-sm text-secondary">
            {showInstallCta
              ? messages.settings.push.iosDisabled
              : (disabledReason ?? messages.settings.push.description)}
          </p>
          {error && <p className="mt-space-xs text-label-sm text-error">{error}</p>}
        </div>
        {showInstallCta ? (
          <Button type="button" size="sm" variant="secondary" onClick={openInstallGuide}>
            {messages.settings.push.installApp}
          </Button>
        ) : (
          <PushToggle enabled={enabled} disabled={toggleDisabled} onChange={handleToggle} />
        )}
      </div>

      {iosNonStandalone && iosDismissed && (
        <p className="mt-space-sm text-label-sm text-secondary">
          {messages.settings.push.badgeFallbackNote}{' '}
          <button
            type="button"
            className="text-on-surface underline underline-offset-2 hover:text-primary"
            onClick={openInstallGuide}
          >
            {messages.settings.push.howToInstall}
          </button>
        </p>
      )}
    </div>
  );
}
