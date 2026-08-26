'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { Button } from '@/components/ui/button';
import {
  SettingsGroupCard,
  SettingsRowDivider,
  SettingsSectionTitle,
  SettingsToggle,
} from '@/components/settings/SettingsUi';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { canRequestPushPermission } from '@/lib/pwa/ios-detect';
import { usePushClientEnv } from '@/lib/pwa/usePushClientEnv';
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

type DndPrefs = {
  dndEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

const DEFAULT_DND_PREFS: DndPrefs = {
  dndEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
};

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
  const [dndPrefs, setDndPrefs] = useState<DndPrefs>(DEFAULT_DND_PREFS);
  const [dndLoading, setDndLoading] = useState(true);
  const [dndError, setDndError] = useState<string | null>(null);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const { hydrated, pushSupported, iosNonStandalone, iosDismissed } = usePushClientEnv();
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

  useEffect(() => {
    if (!isLoggedIn) {
      setDndLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('/api/user/notification-prefs');
        if (response.ok) {
          const data = (await response.json()) as DndPrefs;
          if (!cancelled) {
            setDndPrefs(data);
          }
        }
      } catch {
        // Keep defaults on fetch failure.
      } finally {
        if (!cancelled) {
          setDndLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleDndChange = async (partial: Partial<DndPrefs>) => {
    const previous = dndPrefs;
    const next = { ...previous, ...partial };
    setDndPrefs(next);
    setDndError(null);

    try {
      const response = await fetch('/api/user/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });

      if (!response.ok) {
        setDndPrefs(previous);
        setDndError(messages.settings.dnd.saveError);
      }
    } catch {
      setDndPrefs(previous);
      setDndError(messages.settings.dnd.saveError);
    }
  };

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
    <section className="mb-6">
      <SettingsSectionTitle>{messages.settings.notificationsSection}</SettingsSectionTitle>
      <SettingsGroupCard>
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-medium text-on-surface">{messages.settings.push.title}</p>
            <p className="text-label-sm text-secondary">
              {!hydrated
                ? messages.settings.push.description
                : showInstallCta
                  ? messages.settings.push.iosDisabled
                  : (disabledReason ?? messages.settings.push.description)}
            </p>
            {error && <p className="mt-1 text-label-sm text-error">{error}</p>}
          </div>
          {!hydrated ? (
            <SettingsToggle
              checked={false}
              disabled
              onChange={() => {}}
              ariaLabel={messages.settings.push.disabledLabel}
            />
          ) : showInstallCta ? (
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

        <SettingsRowDivider />

        <div className="flex items-center justify-between gap-4 p-4">
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

        {pushEnabled && !dndLoading && (
          <>
            <SettingsRowDivider />

            <div className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-body-md font-medium text-on-surface">{messages.settings.dnd.title}</p>
                <p className="text-label-sm text-secondary">{messages.settings.dnd.description}</p>
              </div>
              <SettingsToggle
                checked={dndPrefs.dndEnabled}
                onChange={(dndEnabled) => void handleDndChange({ dndEnabled })}
                ariaLabel={
                  dndPrefs.dndEnabled
                    ? messages.settings.dnd.enabledLabel
                    : messages.settings.dnd.disabledLabel
                }
              />
            </div>

            {dndPrefs.dndEnabled && (
              <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
                <label className="flex items-center gap-2 text-label-sm text-secondary">
                  <span>{messages.settings.dnd.startLabel}</span>
                  <input
                    type="time"
                    value={dndPrefs.quietStart}
                    onChange={(event) => void handleDndChange({ quietStart: event.target.value })}
                    className="min-h-11 rounded-lg border border-neutral-200 bg-white px-3 text-body-md text-on-surface"
                  />
                </label>
                <label className="flex items-center gap-2 text-label-sm text-secondary">
                  <span>{messages.settings.dnd.endLabel}</span>
                  <input
                    type="time"
                    value={dndPrefs.quietEnd}
                    onChange={(event) => void handleDndChange({ quietEnd: event.target.value })}
                    className="min-h-11 rounded-lg border border-neutral-200 bg-white px-3 text-body-md text-on-surface"
                  />
                </label>
              </div>
            )}

            {dndError && <p className="px-4 pb-4 text-label-sm text-error">{dndError}</p>}
          </>
        )}
      </SettingsGroupCard>
    </section>
  );
}
