'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { RunNowButton, type RunNowPhase } from '@/components/admin/RunNowButton';
import { adminShellMessages, sourcesMessages } from '@/components/admin/admin-messages';
import { isRunNowActivePhase } from '@/lib/admin/use-run-now';
import { RegaloUrlMatrix } from '@/components/admin/RegaloUrlMatrix';
import { VintedUrlMatrix } from '@/components/admin/VintedUrlMatrix';
import { FacebookUrlMatrix } from '@/components/admin/FacebookUrlMatrix';
import { ReplaceUrlsConfirmDialog } from '@/components/admin/ReplaceUrlsConfirmDialog';
import { TargetUrlEditor } from '@/components/admin/TargetUrlEditor';
import { dedupeUrls } from '@/lib/admin/subito-regalo-catalog';
import { RECOMMENDED_SUBITO_SEED_URLS } from '@/lib/admin/subito-recommended-seed';
import { RECOMMENDED_VINTED_SEED_URLS } from '@/lib/admin/vinted-recommended-seed';
import { RECOMMENDED_FACEBOOK_SEED_URLS } from '@/lib/admin/facebook-recommended-seed';
import type { AntiBlockPreset, SourceDetail } from '@/lib/admin/types';
import {
  formatThresholdPercent,
  SCRAPE_MIN_COUNT_RATIO,
  SCRAPE_MIN_GEO_RESOLUTION_RATE,
  SCRAPE_MIN_SELECTOR_RATE,
} from '@/lib/admin/validation-thresholds';
import { cn } from '@/lib/utils';

type SourceDetailClientProps = {
  initialSource: SourceDetail;
};

const PRESETS: Array<{ id: AntiBlockPreset; title: string; description: string }> = [
  {
    id: 'conservative',
    title: sourcesMessages.presetConservative,
    description: '30–60 秒延迟，最高代理隐蔽性',
  },
  {
    id: 'standard',
    title: sourcesMessages.presetStandard,
    description: '15–30 秒延迟，平衡吞吐量',
  },
  {
    id: 'aggressive',
    title: sourcesMessages.presetAggressive,
    description: '0–5 秒延迟，最大速度',
  },
];

function IosToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="sources-ios-toggle cursor-pointer"
    >
      <span
        className={cn('sources-ios-toggle-track', checked && 'sources-ios-toggle-track-on')}
        aria-hidden
      />
    </button>
  );
}

export function SourceDetailClient({ initialSource }: SourceDetailClientProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialSource.enabled);
  const [interval, setInterval] = useState(initialSource.intervalMinutes);
  const [targetUrlsText, setTargetUrlsText] = useState(initialSource.targetUrls.join('\n'));
  const [antiBlock, setAntiBlock] = useState<AntiBlockPreset>(
    initialSource.antiBlockPreset as AntiBlockPreset,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [matrixResetToken, setMatrixResetToken] = useState(0);
  const [runPhase, setRunPhase] = useState<RunNowPhase>('idle');
  const [sessionJsonText, setSessionJsonText] = useState('');
  const [showSessionJson, setShowSessionJson] = useState(false);
  const [sessionTesting, setSessionTesting] = useState(false);
  const [sessionTestMessage, setSessionTestMessage] = useState<string | null>(null);
  const [sessionTestError, setSessionTestError] = useState(false);

  const isSubito = initialSource.slug === 'subito';
  const isVinted = initialSource.slug === 'vinted';
  const isFacebook = initialSource.slug === 'facebook';
  const hasUrlMatrix = isSubito || isVinted || isFacebook;

  const currentUrlCount = useMemo(
    () =>
      targetUrlsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean).length,
    [targetUrlsText],
  );

  const applyRecommendedSeed = () => {
    const seedUrls = isFacebook
      ? RECOMMENDED_FACEBOOK_SEED_URLS
      : isVinted
        ? RECOMMENDED_VINTED_SEED_URLS
        : RECOMMENDED_SUBITO_SEED_URLS;
    setTargetUrlsText(seedUrls.join('\n'));
    setMatrixResetToken((token) => token + 1);
  };

  const handleApplyRecommendedSeedClick = () => {
    if (currentUrlCount === 0) {
      applyRecommendedSeed();
      return;
    }
    setSeedConfirmOpen(true);
  };

  const decreaseInterval = () => {
    setInterval((prev) => Math.max(30, prev - 15));
  };

  const increaseInterval = () => {
    setInterval((prev) => Math.min(1440, prev + 15));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (interval < 30 || interval > 1440) {
      setError(sourcesMessages.intervalRangeError);
      return;
    }

    const urls = dedupeUrls(
      targetUrlsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    );

    const payload: Record<string, unknown> = {
      enabled,
      interval_minutes: interval,
      anti_block_preset: antiBlock,
      target_urls: urls,
    };

    if (isFacebook && sessionJsonText.trim()) {
      payload.session_json = sessionJsonText.trim();
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/sources/${initialSource.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string | { formErrors?: string[] } };
        if (typeof payload.error === 'string') {
          setError(payload.error);
        } else {
          setError(adminShellMessages.loadError);
        }
        return;
      }

      setSuccess(true);
      if (isFacebook && sessionJsonText.trim()) {
        setSessionJsonText('');
      }
      router.refresh();
    } catch {
      setError(adminShellMessages.loadError);
    } finally {
      setSaving(false);
    }
  };

  const handleRunComplete = () => {
    router.refresh();
  };

  const handleTestSession = async () => {
    setSessionTestMessage(null);
    setSessionTestError(false);

    if (!sessionJsonText.trim()) {
      setSessionTestError(true);
      setSessionTestMessage(sourcesMessages.facebookTestSessionInvalid);
      return;
    }

    setSessionTesting(true);
    try {
      const response = await fetch(`/api/admin/sources/${initialSource.slug}/test-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_json: sessionJsonText.trim() }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        reason?: 'session_expired' | 'invalid_format';
        error?: string;
      };

      if (payload.ok) {
        setSessionTestError(false);
        setSessionTestMessage(sourcesMessages.facebookTestSessionSuccess);
        return;
      }

      setSessionTestError(true);
      if (payload.reason === 'invalid_format') {
        setSessionTestMessage(sourcesMessages.facebookTestSessionInvalid);
      } else {
        setSessionTestMessage(sourcesMessages.facebookTestSessionExpired);
      }
    } catch {
      setSessionTestError(true);
      setSessionTestMessage(adminShellMessages.loadError);
    } finally {
      setSessionTesting(false);
    }
  };

  return (
    <div className="source-detail-page mx-auto max-w-6xl px-1 pb-8">
      <nav className="source-detail-breadcrumb">
        <Link href="/admin/sources" className="source-detail-breadcrumb-link">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            chevron_left
          </span>
          {sourcesMessages.breadcrumbSources}
        </Link>
        <span aria-hidden>/</span>
        <span className="source-detail-breadcrumb-current">{initialSource.displayName}</span>
      </nav>

      <header className="source-detail-header">
        <div className="source-detail-header-copy">
          <h1 className="source-detail-title">
            {sourcesMessages.detailTitle(initialSource.displayName)}
          </h1>
          <p className="source-detail-subtitle">{sourcesMessages.detailSubtitle}</p>
        </div>
        {initialSource.implementationStatus === 'live' ? (
          <div
            className={cn(
              isRunNowActivePhase(runPhase) && 'run-now-wrapper-active rounded p-1',
              runPhase === 'running' && 'run-now-wrapper-running',
            )}
          >
            <RunNowButton
              slug={initialSource.slug}
              variant="full"
              showStatusLink
              onComplete={handleRunComplete}
              onPhaseChange={setRunPhase}
            />
          </div>
        ) : (
          <span className="source-detail-soon-badge">{sourcesMessages.statusComingSoon}</span>
        )}
      </header>

      {error ? (
        <p className="source-detail-alert source-detail-alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="source-detail-alert source-detail-alert-success" role="status">
          {sourcesMessages.saveSuccess}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {isSubito ? (
            <RegaloUrlMatrix
              targetUrlsText={targetUrlsText}
              onTargetUrlsChange={setTargetUrlsText}
              onApplyRecommendedSeedClick={handleApplyRecommendedSeedClick}
              resetToAllChecked={matrixResetToken}
            />
          ) : null}

          {isVinted ? (
            <VintedUrlMatrix
              targetUrlsText={targetUrlsText}
              onTargetUrlsChange={setTargetUrlsText}
              onApplyRecommendedSeedClick={handleApplyRecommendedSeedClick}
              resetToAllChecked={matrixResetToken}
            />
          ) : null}

          {isFacebook ? (
            <FacebookUrlMatrix
              targetUrlsText={targetUrlsText}
              onTargetUrlsChange={setTargetUrlsText}
              onApplyRecommendedSeedClick={handleApplyRecommendedSeedClick}
              resetToAllChecked={matrixResetToken}
            />
          ) : null}

          {isFacebook ? (
            <section className="source-detail-card">
              <header className="source-detail-card-header">
                <div>
                  <h2 className="source-detail-card-title">{sourcesMessages.facebookSessionLabel}</h2>
                  <p className="source-detail-card-subtitle">{sourcesMessages.facebookSessionHelp}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-2.5 py-0.5 text-[12px]">
                  <span
                    className={`h-2 w-2 rounded-full ${initialSource.sessionConfigured ? 'bg-primary' : 'bg-outline-variant'}`}
                    aria-hidden
                  />
                  {initialSource.sessionConfigured
                    ? sourcesMessages.facebookSessionConfigured
                    : sourcesMessages.facebookSessionNotConfigured}
                </span>
              </header>

              <div className="relative rounded border border-outline-variant bg-surface-container-low">
                <textarea
                  value={sessionJsonText}
                  onChange={(event) => {
                    setSessionJsonText(event.target.value);
                    setSessionTestMessage(null);
                  }}
                  rows={6}
                  spellCheck={false}
                  placeholder={sourcesMessages.facebookSessionPlaceholder}
                  className={cn(
                    'w-full resize-y bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed focus:outline-none',
                    !showSessionJson && sessionJsonText ? 'text-transparent caret-on-surface' : 'text-on-surface',
                  )}
                  style={
                    !showSessionJson && sessionJsonText
                      ? { WebkitTextSecurity: 'disc' } as React.CSSProperties
                      : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowSessionJson((current) => !current)}
                  className="absolute right-2 top-2 text-secondary hover:text-on-surface"
                  aria-label={showSessionJson ? 'Hide session JSON' : 'Show session JSON'}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>
                    {showSessionJson ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={sessionTesting}
                  onClick={handleTestSession}
                  className="source-detail-btn-secondary"
                >
                  {sessionTesting
                    ? sourcesMessages.facebookTestSessionRunning
                    : sourcesMessages.facebookTestSession}
                </button>
                {sessionTestMessage ? (
                  <p
                    className={cn(
                      'text-[13px]',
                      sessionTestError ? 'text-error' : 'text-secondary',
                    )}
                    role="status"
                  >
                    {sessionTestMessage}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <TargetUrlEditor
            value={targetUrlsText}
            onChange={setTargetUrlsText}
            sourceSlug={initialSource.slug}
            title={hasUrlMatrix ? '目标 URL' : sourcesMessages.urlsLabel}
            subtitle={
              hasUrlMatrix
                ? '每行一个 URL。可手动编辑或使用上方矩阵生成。'
                : sourcesMessages.urlsHelp
            }
          />
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-4">
          <section className="source-detail-card">
            <div className="source-detail-toggle-row">
              <div>
                <h2 className="source-detail-card-title">{sourcesMessages.sourceStatusLabel}</h2>
                <p className="source-detail-card-subtitle">{sourcesMessages.sourceStatusHelp}</p>
              </div>
              <IosToggle
                checked={enabled}
                onChange={setEnabled}
                label={sourcesMessages.sourceStatusLabel}
              />
            </div>

            {isFacebook ? (
              <>
                <div className="source-detail-divider" />
                <div className="source-detail-field">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="source-detail-card-title">{sourcesMessages.facebookProxyLabel}</h3>
                      <p className="source-detail-card-subtitle">{sourcesMessages.facebookProxyHelp}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-2.5 py-0.5 text-[12px]">
                      <span
                        className={`h-2 w-2 rounded-full ${initialSource.proxyConfigured ? 'bg-primary' : 'bg-outline-variant'}`}
                        aria-hidden
                      />
                      {initialSource.proxyConfigured
                        ? sourcesMessages.facebookProxyConfigured
                        : sourcesMessages.facebookProxyNotConfigured}
                    </span>
                  </div>
                  {!initialSource.proxyConfigured ? (
                    <p className="source-detail-inline-banner source-detail-inline-banner-warning mt-3">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden>
                        warning
                      </span>
                      <span>
                        {sourcesMessages.facebookProxyHelp}{' '}
                        <Link href="/admin/settings" className="underline underline-offset-2">
                          {sourcesMessages.facebookProxySettingsLink}
                        </Link>
                      </span>
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="source-detail-divider" />

            <div className="source-detail-field">
              <label className="source-detail-card-title" htmlFor="source-interval">
                {sourcesMessages.intervalLabel}
              </label>
              <p className="source-detail-card-subtitle">{sourcesMessages.intervalHelp}</p>
              <div className="source-detail-stepper-row">
                <div className="source-detail-stepper">
                  <button type="button" onClick={decreaseInterval} aria-label="减少间隔">
                    −
                  </button>
                  <input
                    id="source-interval"
                    type="number"
                    min={30}
                    max={1440}
                    value={interval}
                    onChange={(event) => setInterval(Number(event.target.value))}
                    className="source-detail-stepper-input tabular-nums"
                  />
                  <button type="button" onClick={increaseInterval} aria-label="增加间隔">
                    +
                  </button>
                </div>
                <span className="source-detail-stepper-caption tabular-nums">
                  {sourcesMessages.intervalEvery(interval)}
                </span>
              </div>
            </div>
          </section>

          <section className="source-detail-card">
            <header className="source-detail-card-header">
              <div>
                <h2 className="source-detail-card-title">{sourcesMessages.antiBlockLabel}</h2>
                <p className="source-detail-card-subtitle">{sourcesMessages.antiBlockHelp}</p>
              </div>
            </header>
            <div className="source-detail-preset-list">
              {PRESETS.map((preset) => {
                const selected = antiBlock === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAntiBlock(preset.id)}
                    aria-pressed={selected}
                    className={cn(
                      'source-detail-preset-card',
                      selected && 'source-detail-preset-card-selected',
                    )}
                  >
                    <div className="source-detail-preset-card-head">
                      <span className="source-detail-preset-title">{preset.title}</span>
                      {selected ? (
                        <span className="material-symbols-outlined text-[18px]" aria-hidden>
                          check_circle
                        </span>
                      ) : null}
                    </div>
                    <p className="source-detail-preset-description">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="source-detail-card">
            <header className="source-detail-card-header">
              <div>
                <h2 className="source-detail-card-title">{sourcesMessages.thresholdsLabel}</h2>
                <p className="source-detail-card-subtitle">{sourcesMessages.thresholdsHelp}</p>
              </div>
            </header>
            <div className="source-detail-threshold-tags">
              <span className="source-detail-threshold-tag tabular-nums">
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  check_circle
                </span>
                {sourcesMessages.thresholdSelector} ≥{formatThresholdPercent(SCRAPE_MIN_SELECTOR_RATE)}
              </span>
              <span className="source-detail-threshold-tag tabular-nums">
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  check_circle
                </span>
                {sourcesMessages.thresholdCount} ≥{formatThresholdPercent(SCRAPE_MIN_COUNT_RATIO)}
              </span>
              <span className="source-detail-threshold-tag tabular-nums">
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  check_circle
                </span>
                {sourcesMessages.thresholdGeo} ≥
                {formatThresholdPercent(SCRAPE_MIN_GEO_RESOLUTION_RATE)}
              </span>
            </div>
          </section>

          <section className="source-detail-card source-detail-save-panel lg:sticky lg:top-6">
            <p className="source-detail-save-note">{sourcesMessages.saveFooterNote}</p>
            <div className="source-detail-save-actions">
              <Link href="/admin/sources" className="source-detail-btn-ghost">
                {sourcesMessages.cancel}
              </Link>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="source-detail-btn-primary"
              >
                {sourcesMessages.save}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {hasUrlMatrix ? (
        <ReplaceUrlsConfirmDialog
          open={seedConfirmOpen}
          onOpenChange={setSeedConfirmOpen}
          currentCount={currentUrlCount}
          onConfirmReplace={applyRecommendedSeed}
        />
      ) : null}
    </div>
  );
}
