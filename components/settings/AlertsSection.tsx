'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { AlertCreateSheet } from '@/components/settings/AlertCreateSheet';
import { PushToggleSection } from '@/components/settings/PushToggleSection';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import type { AlertRow } from '@/lib/alerts/schemas';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type AlertsSectionProps = {
  autoOpenCreate?: boolean;
};

function alertSummary(
  alert: AlertRow,
  messages: ReturnType<typeof useMessages>['messages'],
  zoneLabel: ReturnType<typeof useMessages>['zoneLabel'],
): string {
  const parts: string[] = [];
  if (alert.keyword) parts.push(alert.keyword);
  if (alert.zone) {
    parts.push(zoneLabel(alert.zone));
  } else if (!alert.keyword) {
    parts.push(zoneLabel('All'));
  } else {
    parts.push(messages.settings.alerts.allZonesShort);
  }
  return parts.join(' · ');
}

function AlertToggle({
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
        aria-label={enabled ? messages.settings.alerts.enabled : messages.settings.alerts.disabled}
      />
      <span className="h-5 w-10 rounded-full bg-secondary-fixed peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-outline after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-outline-variant after:bg-surface-container-lowest after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );
}

export function AlertsSection({ autoOpenCreate = false }: AlertsSectionProps) {
  const { messages, zoneLabel } = useMessages();

  const { user, loading: authLoading } = useAuthSession();
  const isLoggedIn = Boolean(user);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setError(null);
    const response = await fetch('/api/alerts');
    if (response.status === 401) {
      setAlerts([]);
      return;
    }
    if (!response.ok) {
      setError(messages.settings.alerts.loadError);
      return;
    }
    const payload = (await response.json()) as { alerts: AlertRow[] };
    setAlerts(payload.alerts ?? []);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isLoggedIn) {
      loadAlerts().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [authLoading, isLoggedIn, loadAlerts]);

  useEffect(() => {
    if (autoOpenCreate && isLoggedIn && !loading) {
      setCreateOpen(true);
    }
  }, [autoOpenCreate, isLoggedIn, loading]);

  const handleCreateClick = () => {
    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }
    setCreateOpen(true);
  };

  const handleToggle = async (alert: AlertRow, enabled: boolean) => {
    const response = await fetch(`/api/alerts/${alert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(typeof payload.error === 'string' ? payload.error : messages.settings.alerts.updateError);
      return;
    }

    await loadAlerts();
  };

  const handleDelete = async (alert: AlertRow) => {
    if (!window.confirm(messages.settings.alerts.deleteConfirm)) return;

    const response = await fetch(`/api/alerts/${alert.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setError(messages.settings.alerts.deleteError);
      return;
    }

    await loadAlerts();
  };

  return (
    <>
      <section id="alerts" className="mb-space-xl scroll-mt-space-lg">
        <div className="mb-space-md flex items-center justify-between">
          <h2 className="ml-space-xs text-label-md uppercase tracking-wider text-on-secondary-container">
            {messages.settings.alerts.sectionTitle}
          </h2>
          <button
            type="button"
            onClick={handleCreateClick}
            className="flex items-center gap-1 text-label-sm font-medium text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {messages.settings.alerts.createButton}
          </button>
        </div>

        <div className="overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
          {!isLoggedIn ? (
            <div className="p-space-md">
              <p className="text-body-md text-on-surface-variant">{messages.settings.alerts.signInPrompt}</p>
              <Button type="button" className="mt-space-md w-fit" onClick={() => setAuthOpen(true)}>
                {messages.settings.signIn}
              </Button>
            </div>
          ) : loading ? (
            <div className="p-space-md">
              <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-space-md">
              <p className="text-body-md font-medium text-on-surface">{messages.settings.alerts.emptyTitle}</p>
              <p className="mt-space-xs text-label-sm text-secondary">
                {messages.settings.alerts.emptyDescription}
              </p>
              <Button type="button" className="mt-space-md w-fit" onClick={() => setCreateOpen(true)}>
                {messages.settings.alerts.createButton}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-center justify-between gap-space-md p-space-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-medium text-on-surface">
                      {alertSummary(alert, messages, zoneLabel)}
                    </p>
                    <p className="text-label-sm text-secondary">
                      {alert.enabled
                        ? messages.settings.alerts.enabled
                        : messages.settings.alerts.disabled}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-space-sm">
                    <AlertToggle
                      enabled={alert.enabled}
                      onChange={(enabled) => handleToggle(alert, enabled)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={messages.settings.alerts.delete}
                      onClick={() => handleDelete(alert)}
                    >
                      <span className="material-symbols-outlined text-on-surface-variant">delete</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="border-t border-outline-variant p-space-md">
              <p className="text-label-sm text-error">{error}</p>
            </div>
          )}

          {isLoggedIn && <PushToggleSection isLoggedIn={isLoggedIn} />}
        </div>
      </section>

      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/settings?tab=alerts"
        modalTitle={messages.auth.alertTitle}
      />

      {isLoggedIn && (
        <AlertCreateSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={loadAlerts}
        />
      )}
    </>
  );
}
