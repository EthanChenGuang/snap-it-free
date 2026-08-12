'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { DegradedBanner } from '@/components/admin/DegradedBanner';
import { adminShellMessages, settingsMessages, sourcesMessages } from '@/components/admin/admin-messages';
import type { GlobalSettingsConfig } from '@/lib/admin/types';
import {
  formatThresholdPercent,
  SCRAPE_MIN_COUNT_RATIO,
  SCRAPE_MIN_GEO_RESOLUTION_RATE,
  SCRAPE_MIN_SELECTOR_RATE,
} from '@/lib/admin/validation-thresholds';

type SettingsClientProps = {
  initialConfig: GlobalSettingsConfig;
  currentUserEmail: string;
  initialOperators: string[];
};

function formatLastBlockReason(reason: string | null | undefined): string {
  const trimmed = reason?.trim();
  if (!trimmed) {
    return settingsMessages.lastBlockReasonEmpty;
  }
  if (trimmed.includes('proxy quota direct fallback')) {
    return settingsMessages.proxyQuotaFallbackReason;
  }
  return trimmed;
}

export function SettingsClient({
  initialConfig,
  currentUserEmail,
  initialOperators,
}: SettingsClientProps) {
  const router = useRouter();
  const [globalPause, setGlobalPause] = useState(initialConfig.globalPause);
  const [pauseSaving, setPauseSaving] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [showProxy, setShowProxy] = useState(false);
  const [proxyConfigured, setProxyConfigured] = useState(initialConfig.proxyConfigured);
  const [telegramChatId, setTelegramChatId] = useState(initialConfig.telegramChatId ?? '');
  const [alertEmail, setAlertEmail] = useState(initialConfig.alertEmail ?? '');
  const [autoTranslate, setAutoTranslate] = useState(initialConfig.autoTranslate);
  const [dailyCap, setDailyCap] = useState(initialConfig.dailyTranslationCap);
  const [translationProvider, setTranslationProvider] = useState(
    initialConfig.translationProvider,
  );
  const [translationsToday, setTranslationsToday] = useState(initialConfig.translationsToday);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operators, setOperators] = useState(initialOperators);
  const [newOperatorEmail, setNewOperatorEmail] = useState('');
  const [allowlistSaving, setAllowlistSaving] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);
  const [earlyStopK, setEarlyStopK] = useState(initialConfig.earlyStopK);
  const [fullRefreshHours, setFullRefreshHours] = useState(initialConfig.fullRefreshHours);
  const [maxPages, setMaxPages] = useState(initialConfig.maxPages);
  const [fullCrawlStarting, setFullCrawlStarting] = useState(false);
  const [fullCrawlError, setFullCrawlError] = useState<string | null>(null);
  const lastBlockReason = initialConfig.lastBlockReason;
  const degradedRunCount = initialConfig.degradedRunCount;

  const capExceeded = translationsToday >= dailyCap;

  const handleGlobalPauseToggle = useCallback(async () => {
    setPauseSaving(true);
    const next = !globalPause;
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_pause: next }),
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { config: { global_pause: boolean } };
      setGlobalPause(payload.config.global_pause);
      router.refresh();
    } finally {
      setPauseSaving(false);
    }
  }, [globalPause, router]);

  const handleSaveConfig = async () => {
    setError(null);
    setSaving(true);

    const body: Record<string, unknown> = {
      telegram_chat_id: telegramChatId.trim() || null,
      alert_email: alertEmail.trim() || null,
      auto_translate: autoTranslate,
      daily_translation_cap: dailyCap,
      translation_provider: translationProvider,
      early_stop_k: earlyStopK,
      full_refresh_hours: fullRefreshHours,
      max_pages: maxPages,
    };

    if (proxyUrl.trim()) {
      body.proxy_url = proxyUrl.trim();
    }

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setError(settingsMessages.saveError);
        return;
      }

      const payload = (await response.json()) as {
        config: {
          proxy_configured: boolean;
          translations_today: number;
          auto_translate: boolean;
        };
      };
      setProxyConfigured(payload.config.proxy_configured);
      setTranslationsToday(payload.config.translations_today);
      setAutoTranslate(payload.config.auto_translate);
      setProxyUrl('');
      router.refresh();
    } catch {
      setError(settingsMessages.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOperator = async () => {
    setError(null);
    setAllowlistSaving(true);
    try {
      const response = await fetch('/api/admin/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newOperatorEmail.trim() }),
      });

      if (!response.ok) {
        setError(settingsMessages.saveError);
        return;
      }

      const payload = (await response.json()) as { operators: string[] };
      setOperators(payload.operators);
      setNewOperatorEmail('');
      router.refresh();
    } catch {
      setError(settingsMessages.saveError);
    } finally {
      setAllowlistSaving(false);
    }
  };

  const handleDeleteOperator = async (email: string) => {
    setError(null);
    setAllowlistSaving(true);
    try {
      const response = await fetch('/api/admin/operators', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? settingsMessages.saveError);
        setDeleteConfirmEmail(null);
        return;
      }

      const payload = (await response.json()) as { operators: string[] };
      setOperators(payload.operators);
      setDeleteConfirmEmail(null);
      router.refresh();
    } catch {
      setError(settingsMessages.saveError);
    } finally {
      setAllowlistSaving(false);
    }
  };

  const handleRunFullCrawl = async () => {
    setFullCrawlError(null);
    setFullCrawlStarting(true);
    try {
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_slug: 'subito', crawl_mode: 'full' }),
      });

      if (!response.ok) {
        setFullCrawlError(settingsMessages.runFullCrawlError);
        return;
      }

      router.refresh();
    } catch {
      setFullCrawlError(settingsMessages.runFullCrawlError);
    } finally {
      setFullCrawlStarting(false);
    }
  };

  const isSelf = (email: string) =>
    email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase();

  const isLastOperator = operators.length <= 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-outline-variant pb-6">
        <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">
          {settingsMessages.pageTitle}
        </h1>
        <p className="mt-1 text-[15px] text-secondary">{settingsMessages.sectionSubtitle}</p>
      </header>

      {error ? (
        <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-error">
          {error}
        </p>
      ) : null}

      {capExceeded ? (
        <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-on-surface">
          {settingsMessages.capExceededNotice}
        </p>
      ) : null}

      {initialConfig.showDegradedBanner ? <DegradedBanner /> : null}

      <section className="flex flex-col justify-between gap-4 rounded border border-outline-variant bg-surface p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              power_settings_new
            </span>
            {settingsMessages.globalPauseTitle}
          </h2>
          <p className="mt-1 max-w-lg text-[14px] text-secondary">{settingsMessages.globalPauseHelp}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[12px] font-medium uppercase tracking-wide ${globalPause ? 'text-error' : 'text-secondary'}`}
          >
            {globalPause ? settingsMessages.pauseActive : settingsMessages.pauseInactive}
          </span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={globalPause}
              disabled={pauseSaving}
              onChange={handleGlobalPauseToggle}
              className="peer sr-only"
            />
            <span
              className="h-6 w-12 rounded-full bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-outline-variant after:bg-surface after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-6"
              aria-hidden
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded border border-outline-variant bg-surface p-5">
        <div className="flex flex-col gap-3 border-b border-outline-variant pb-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              speed
            </span>
            {settingsMessages.crawlEfficiencyTitle}
          </h2>
          <button
            type="button"
            disabled={fullCrawlStarting || globalPause}
            onClick={handleRunFullCrawl}
            className="inline-flex min-h-11 items-center justify-center rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {fullCrawlStarting
              ? settingsMessages.runFullCrawlStarting
              : settingsMessages.runFullCrawl}
          </button>
        </div>

        {fullCrawlError ? (
          <p className="text-[15px] text-error">{fullCrawlError}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[14px] font-semibold">
              {settingsMessages.earlyStopKLabel}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={earlyStopK}
              onChange={(event) => setEarlyStopK(Number(event.target.value))}
              className="min-h-11 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[12px] text-secondary">{settingsMessages.earlyStopKHelp}</p>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-semibold">
              {settingsMessages.fullRefreshHoursLabel}
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={fullRefreshHours}
              onChange={(event) => setFullRefreshHours(Number(event.target.value))}
              className="min-h-11 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[12px] text-secondary">
              {settingsMessages.fullRefreshHoursHelp}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-semibold">
              {settingsMessages.maxPagesLabel}
            </label>
            <input
              type="number"
              min={1}
              max={3}
              value={maxPages}
              onChange={(event) => setMaxPages(Number(event.target.value))}
              className="min-h-11 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[12px] text-secondary">{settingsMessages.maxPagesHelp}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-4 rounded border border-outline-variant bg-surface p-5 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                router
              </span>
              {settingsMessages.proxyTitle}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-2.5 py-0.5 text-[12px]">
              <span
                className={`h-2 w-2 rounded-full ${proxyConfigured ? 'bg-primary' : 'bg-outline-variant'}`}
                aria-hidden
              />
              {proxyConfigured ? settingsMessages.proxyConfigured : settingsMessages.proxyNotConfigured}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-semibold">{settingsMessages.proxyUrlLabel}</label>
            <div className="relative max-h-24 overflow-y-auto rounded border border-outline-variant bg-surface-container-low">
              <input
                type={showProxy ? 'text' : 'password'}
                value={proxyUrl}
                onChange={(event) => setProxyUrl(event.target.value)}
                placeholder={
                  proxyConfigured && !proxyUrl ? '••••••••••••••••••••' : settingsMessages.proxyPlaceholder
                }
                className="w-full bg-transparent px-3 py-2 font-mono text-[14px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowProxy((current) => !current)}
                className="absolute right-2 top-2 text-secondary hover:text-on-surface"
                aria-label={showProxy ? 'Hide proxy URL' : 'Show proxy URL'}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  {showProxy ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="mt-1 text-[12px] text-secondary">{settingsMessages.proxyHelp}</p>
          </div>

          <div className="space-y-3 border-t border-outline-variant pt-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-secondary">
                {settingsMessages.lastBlockReasonLabel}
              </p>
              <p
                className="mt-1 line-clamp-2 text-[15px] text-on-surface"
                title={lastBlockReason?.trim() || undefined}
              >
                {formatLastBlockReason(lastBlockReason)}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-secondary">
                {settingsMessages.degradedRunsLabel}
              </p>
              <p className="mt-1 font-mono text-[15px] text-on-surface">{degradedRunCount}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded border border-outline-variant bg-surface p-5 lg:col-span-5">
          <h2 className="mb-4 flex items-center gap-2 border-b border-outline-variant pb-3 text-[15px] font-semibold">
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              campaign
            </span>
            {settingsMessages.alertRoutingTitle}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[14px] font-semibold">
                {settingsMessages.telegramChatIdLabel}
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(event) => setTelegramChatId(event.target.value)}
                placeholder="-1001234567890"
                className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-[12px] text-secondary">{settingsMessages.telegramHelp}</p>
            </div>

            <div>
              <label className="mb-1 block text-[14px] font-semibold">
                {settingsMessages.alertEmailLabel}
              </label>
              <input
                type="email"
                value={alertEmail}
                onChange={(event) => setAlertEmail(event.target.value)}
                placeholder="admin@domain.com"
                className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-[12px] text-secondary">{settingsMessages.alertEmailHelp}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded border border-outline-variant bg-surface p-5">
        <h2 className="text-[15px] font-semibold">{settingsMessages.sectionTitle}</h2>

        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <p className="font-semibold">{settingsMessages.autoTranslateLabel}</p>
            <p className="mt-1 text-[14px] text-secondary">{settingsMessages.autoTranslateHelp}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(event) => setAutoTranslate(event.target.checked)}
              className="peer sr-only"
            />
            <span
              className="h-5 w-10 rounded-full bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-outline-variant after:bg-surface after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"
              aria-hidden
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-outline-variant pb-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block font-semibold">{settingsMessages.dailyCapLabel}</label>
            <input
              type="number"
              min={1}
              value={dailyCap}
              onChange={(event) => setDailyCap(Number(event.target.value))}
              className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[12px] text-secondary">{settingsMessages.dailyCapHelp}</p>
          </div>

          <div>
            <label className="mb-1 block font-semibold">{settingsMessages.translationProviderLabel}</label>
            <select
              value={translationProvider}
              onChange={(event) =>
                setTranslationProvider(event.target.value as 'gemini' | 'openrouter')
              }
              className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
            >
              <option value="gemini">{settingsMessages.providerGemini}</option>
              <option value="openrouter">{settingsMessages.providerOpenrouter}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block font-semibold">{sourcesMessages.thresholdsLabel}</label>
            <p className="mt-1 text-[14px] text-secondary">{sourcesMessages.thresholdsHelp}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 font-mono text-[14px]">
              {sourcesMessages.thresholdSelector} ≥{formatThresholdPercent(SCRAPE_MIN_SELECTOR_RATE)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 font-mono text-[14px]">
              {sourcesMessages.thresholdCount} ≥{formatThresholdPercent(SCRAPE_MIN_COUNT_RATIO)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 font-mono text-[14px]">
              {sourcesMessages.thresholdGeo} ≥{formatThresholdPercent(SCRAPE_MIN_GEO_RESOLUTION_RATE)}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded border border-outline-variant bg-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold">{settingsMessages.allowlistTitle}</h2>
          <p className="mt-1 text-[14px] text-secondary">{settingsMessages.allowlistHelp}</p>
        </div>

        <ul className="divide-y divide-outline-variant rounded border border-outline-variant">
          {operators.map((email) => (
            <li key={email} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-mono text-[14px]">{email}</span>
              {deleteConfirmEmail === email ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-secondary">{settingsMessages.allowlistDeleteConfirm}</span>
                  <button
                    type="button"
                    disabled={allowlistSaving || isSelf(email) || isLastOperator}
                    onClick={() => handleDeleteOperator(email)}
                    className="rounded bg-error px-3 py-1 text-[12px] font-semibold text-on-error disabled:opacity-50"
                  >
                    {settingsMessages.allowlistDelete}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmEmail(null)}
                    className="rounded border border-outline-variant px-3 py-1 text-[12px]"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSelf(email) || isLastOperator}
                  title={
                    isSelf(email)
                      ? settingsMessages.allowlistDeleteBlockedSelf
                      : isLastOperator
                        ? settingsMessages.allowlistDeleteBlockedLast
                        : undefined
                  }
                  onClick={() => setDeleteConfirmEmail(email)}
                  className="rounded border border-outline-variant px-3 py-1 text-[12px] text-secondary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {settingsMessages.allowlistDelete}
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={newOperatorEmail}
            onChange={(event) => setNewOperatorEmail(event.target.value)}
            placeholder={settingsMessages.allowlistEmailPlaceholder}
            className="flex-1 rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[14px] focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            disabled={allowlistSaving || !newOperatorEmail.trim()}
            onClick={handleAddOperator}
            className="rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {settingsMessages.allowlistAdd}
          </button>
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-col gap-3 rounded border border-outline-variant bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1 text-[12px] text-secondary">
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            info
          </span>
          {settingsMessages.serverKeysNote}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveConfig}
          className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            save
          </span>
          {settingsMessages.updateConfiguration}
        </button>
      </div>
    </div>
  );
}

export function SettingsLoadError() {
  return (
    <div className="rounded border border-outline-variant bg-surface p-6 text-[15px] text-error">
      {adminShellMessages.loadError}
    </div>
  );
}
