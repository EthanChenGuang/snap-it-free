'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { AlertCreateSheet } from '@/components/settings/AlertCreateSheet';
import { SettingsGroupCard } from '@/components/settings/SettingsUi';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import type { AlertRow } from '@/lib/alerts/schemas';
import { consumerCityFilterLabelsFromMessages } from '@/lib/i18n/city-labels';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type ZonesSectionProps = {
  autoOpenCreate?: boolean;
};

function alertLocationLabel(
  alert: AlertRow,
  cityLabels: ReturnType<typeof consumerCityFilterLabelsFromMessages>,
  zoneLabel: ReturnType<typeof useMessages>['zoneLabel'],
): string | null {
  if (alert.city) return cityLabels[alert.city];
  if (alert.zone) return zoneLabel(alert.zone);
  return null;
}

function alertRegionLabel(
  alert: AlertRow,
  cityLabels: ReturnType<typeof consumerCityFilterLabelsFromMessages>,
  zoneLabel: ReturnType<typeof useMessages>['zoneLabel'],
  allCitiesLabel: string,
): string {
  const location = alertLocationLabel(alert, cityLabels, zoneLabel);
  return location ?? allCitiesLabel;
}

function alertIcon(alert: AlertRow): string {
  return alert.keyword && !alert.city && !alert.zone ? 'search' : 'location_on';
}

function formatZoneUpdatedAt(
  iso: string,
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return messages.settings.zones.updatedJustNow;
  if (minutes < 60) return messages.settings.zones.updatedMinutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return messages.settings.zones.updatedHours(hours);
  const days = Math.floor(hours / 24);
  return messages.settings.zones.updatedDays(days);
}

function ZoneCardMenu({
  alert,
  onToggle,
  onDelete,
}: {
  alert: AlertRow;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { messages } = useMessages();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="text-outline transition-colors hover:text-primary"
        aria-label={messages.settings.zones.menuLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-space-xs min-w-[160px] overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
          <button
            type="button"
            className="block w-full px-space-md py-space-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
          >
            {alert.enabled ? messages.settings.zones.pause : messages.settings.zones.resume}
          </button>
          <button
            type="button"
            className="block w-full px-space-md py-space-sm text-left text-label-md text-error hover:bg-surface-container-low"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            {messages.settings.zones.delete}
          </button>
        </div>
      )}
    </div>
  );
}

export function ZonesSection({ autoOpenCreate = false }: ZonesSectionProps) {
  const { messages, zoneLabel } = useMessages();
  const cityLabels = consumerCityFilterLabelsFromMessages(messages);

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
  }, [messages.settings.alerts.loadError]);

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

  const handleToggle = async (alert: AlertRow) => {
    const response = await fetch(`/api/alerts/${alert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !alert.enabled }),
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
      <section id="zones" className="mb-space-lg scroll-mt-space-lg">
        <div className="mb-2 flex items-center justify-between px-4">
          <h2 className="text-label-sm font-medium uppercase tracking-wide text-on-surface-variant">
            {messages.settings.zones.sectionTitle}
          </h2>
          <button
            type="button"
            onClick={handleCreateClick}
            className="flex items-center gap-0.5 text-label-sm font-medium text-primary transition-opacity hover:opacity-80 active:opacity-70"
          >
            <span className="material-symbols-outlined text-label-md">add</span>
            {messages.settings.zones.addZone}
          </button>
        </div>

        {!isLoggedIn ? (
          <SettingsGroupCard className="p-4">
            <p className="text-body-md text-on-surface-variant">{messages.settings.alerts.signInPrompt}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-3 h-auto px-0 py-0 text-label-sm font-medium"
              onClick={() => setAuthOpen(true)}
            >
              {messages.settings.signIn}
            </Button>
          </SettingsGroupCard>
        ) : loading ? (
          <SettingsGroupCard className="p-4">
            <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
          </SettingsGroupCard>
        ) : alerts.length === 0 ? (
          <SettingsGroupCard className="p-4">
            <p className="text-body-md font-medium text-on-surface">{messages.settings.zones.emptyTitle}</p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              {messages.settings.zones.emptyDescription}
            </p>
            <Button type="button" size="sm" variant="secondary" className="mt-4 gap-1" onClick={() => setCreateOpen(true)}>
              <span className="material-symbols-outlined text-label-md">add</span>
              {messages.settings.zones.addZone}
            </Button>
          </SettingsGroupCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alerts.map((alert) => (
              <SettingsGroupCard key={alert.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container">
                    <span className="material-symbols-outlined text-primary">{alertIcon(alert)}</span>
                  </div>
                  <ZoneCardMenu
                    alert={alert}
                    onToggle={() => handleToggle(alert)}
                    onDelete={() => handleDelete(alert)}
                  />
                </div>
                <div className="space-y-1">
                  {alert.keyword ? (
                    <p className="text-body-md text-on-surface">
                      <span className="text-on-surface-variant">{messages.settings.zones.keywordField}：</span>
                      {alert.keyword}
                    </p>
                  ) : null}
                  <p className="text-body-md text-on-surface">
                    <span className="text-on-surface-variant">{messages.settings.zones.regionField}：</span>
                    {alertRegionLabel(
                      alert,
                      cityLabels,
                      zoneLabel,
                      messages.settings.zones.allCities,
                    )}
                  </p>
                </div>
                <div className="mt-space-xs flex items-center gap-space-sm">
                  <span
                    className={cn(
                      'rounded-sm px-2 py-0.5 text-label-sm font-medium uppercase',
                      alert.enabled
                        ? 'bg-secondary-fixed text-on-surface'
                        : 'bg-surface-container-high text-on-surface-variant',
                    )}
                  >
                    {alert.enabled ? messages.settings.zones.active : messages.settings.zones.paused}
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    {alert.enabled
                      ? formatZoneUpdatedAt(alert.created_at, messages)
                      : messages.settings.zones.noRecentActivity}
                  </span>
                </div>
              </SettingsGroupCard>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-label-sm text-error">{error}</p>}
      </section>

      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/settings?tab=alerts"
        modalTitle={messages.auth.alertTitle}
      />

      {isLoggedIn && (
        <AlertCreateSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={loadAlerts} />
      )}
    </>
  );
}
