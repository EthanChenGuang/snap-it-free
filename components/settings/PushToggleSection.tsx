'use client';

import { useCallback, useEffect, useState } from 'react';
import { canOfferPush, isIOS } from '@/lib/pwa/ios-detect';
import { urlBase64ToUint8Array } from '@/lib/pwa/vapid';
import { messages } from '@/messages/it';
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
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const iosBlocked = isIOS();
  const pushSupported = canOfferPush();
  const disabledReason = iosBlocked
    ? messages.settings.push.iosDisabled
    : !pushSupported
      ? messages.settings.push.unsupported
      : !vapidPublicKey
        ? messages.settings.push.vapidMissing
        : null;

  const refreshSubscription = useCallback(async () => {
    if (!pushSupported || iosBlocked) {
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [pushSupported, iosBlocked]);

  useEffect(() => {
    if (!isLoggedIn) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    void refreshSubscription();
  }, [isLoggedIn, refreshSubscription]);

  const handleToggle = async (nextEnabled: boolean) => {
    if (!isLoggedIn || disabledReason || busy) return;

    setBusy(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (nextEnabled) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError(messages.settings.push.permissionDenied);
          return;
        }

        if (!vapidPublicKey) {
          setError(messages.settings.push.vapidMissing);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });

        if (!response.ok) {
          await subscription.unsubscribe();
          setError(messages.settings.push.subscribeError);
          return;
        }

        setEnabled(true);
      } else {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint }),
          });
        }
        setEnabled(false);
      }
    } catch {
      setError(messages.settings.push.subscribeError);
    } finally {
      setBusy(false);
    }
  };

  const toggleDisabled = !isLoggedIn || Boolean(disabledReason) || loading || busy;

  return (
    <div className="flex items-center justify-between gap-space-md border-t border-outline-variant p-space-md">
      <div className="min-w-0 flex-1">
        <p className="text-body-md font-medium text-on-surface">{messages.settings.push.title}</p>
        <p className="text-label-sm text-secondary">
          {disabledReason ?? messages.settings.push.description}
        </p>
        {error && <p className="mt-space-xs text-label-sm text-error">{error}</p>}
      </div>
      <PushToggle enabled={enabled} disabled={toggleDisabled} onChange={handleToggle} />
    </div>
  );
}
