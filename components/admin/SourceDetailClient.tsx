'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { RunNowButton, type RunNowPhase } from '@/components/admin/RunNowButton';
import { adminShellMessages, sourcesMessages } from '@/components/admin/admin-messages';
import { isRunNowActivePhase } from '@/lib/admin/use-run-now';
import { RegaloUrlMatrix } from '@/components/admin/RegaloUrlMatrix';
import { VintedUrlMatrix } from '@/components/admin/VintedUrlMatrix';
import { ReplaceUrlsConfirmDialog } from '@/components/admin/ReplaceUrlsConfirmDialog';
import { TargetUrlEditor } from '@/components/admin/TargetUrlEditor';
import { dedupeUrls } from '@/lib/admin/subito-regalo-catalog';
import { RECOMMENDED_SUBITO_SEED_URLS } from '@/lib/admin/subito-recommended-seed';
import { RECOMMENDED_VINTED_SEED_URLS } from '@/lib/admin/vinted-recommended-seed';
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

  const isSubito = initialSource.slug === 'subito';
  const isVinted = initialSource.slug === 'vinted';
  const hasUrlMatrix = isSubito || isVinted;

  const currentUrlCount = useMemo(
    () =>
      targetUrlsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean).length,
    [targetUrlsText],
  );

  const applyRecommendedSeed = () => {
    const seedUrls = isVinted ? RECOMMENDED_VINTED_SEED_URLS : RECOMMENDED_SUBITO_SEED_URLS;
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

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/sources/${initialSource.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          interval_minutes: interval,
          anti_block_preset: antiBlock,
          target_urls: urls,
        }),
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
