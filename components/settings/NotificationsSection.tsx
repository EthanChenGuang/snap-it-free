'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { Button } from '@/components/ui/button';
import {
  SettingsCard,
  SettingsSectionTitle,
  SettingsToggle,
} from '@/components/settings/SettingsUi';
import { useAuthSession } from '@/lib/auth/useAuthSession';
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
import {
  readAppPreferences,
  subscribeAppPreferences,
  writeAppPreferences,
} from '@/lib/settings/preferences';
import { useMessages } from '@/lib/i18n/useMessages';
import { useSyncExternalStore } from 'react';

export function NotificationsSection() {
  const { messages } = useMessages();

  const { user } = useAuthSession();
  const isLoggedIn = Boolean(user);
  const { openInstallGuide } = usePwaOnboarding();
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => readAppPreferences(),
  );

  const [pushEnabled, setPushEnabled] = useState(false);
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
      setPushEnabled(active);
    } catch {
      setPushEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [canSubscribe]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPushEnabled(false);
      setLoading(false);
      return;
    }
    void refreshSubscription();
  }, [isLoggedIn, refreshSubscription]);

  const handlePushToggle = async (nextEnabled: boolean) => {
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
        setPushEnabled(true);
      } else {
        const ok = await unsubscribePush();
        if (!ok) {
          setError(messages.settings.push.subscribeError);
          return;
        }
        setPushEnabled(false);
      }
    } catch {
      setError(messages.settings.push.subscribeError);
    } finally {
      setBusy(false);
    }
  };

  const showInstallCta = iosNonStandalone && !iosDismissed;
  const pushToggleDisabled =
    !isLoggedIn || Boolean(disabledReason) || loading || busy || showInstallCta;

  return (
    <section className="mb-space-xl">
      <SettingsSectionTitle>{messages.settings.notificationsSection}</SettingsSectionTitle>
      <SettingsCard>
        <div className="flex items-center justify-between gap-space-md border-b border-outline-variant p-space-md">
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
            <SettingsToggle
              checked={pushEnabled}
              disabled={pushToggleDisabled}
              onChange={handlePushToggle}
              ariaLabel={
                pushEnabled ? messages.settings.push.enabledLabel : messages.settings.push.disabledLabel
              }
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-space-md p-space-md">
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-medium text-on-surface">{messages.settings.sound.title}</p>
            <p className="text-label-sm text-secondary">{messages.settings.sound.description}</p>
          </div>
          <SettingsToggle
            checked={preferences.soundAlerts}
            onChange={(soundAlerts) => writeAppPreferences({ soundAlerts })}
            ariaLabel={
              preferences.soundAlerts
                ? messages.settings.sound.enabledLabel
                : messages.settings.sound.disabledLabel
            }
          />
        </div>
      </SettingsCard>
    </section>
  );
}
