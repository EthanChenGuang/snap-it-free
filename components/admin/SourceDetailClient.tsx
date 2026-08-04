'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminShellMessages, sourcesMessages } from '@/components/admin/admin-messages';
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

    const urls = targetUrlsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

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

  const handleRunNow = async () => {
    if (initialSource.implementationStatus === 'coming_soon') {
      setError(sourcesMessages.comingSoonRunBlocked);
      return;
    }

    setError(null);
    try {
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_slug: initialSource.slug }),
      });
      if (!response.ok) {
        throw new Error('run failed');
      }
    } catch {
      setError(adminShellMessages.loadError);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="flex items-center gap-2 text-[14px] text-secondary">
        <Link href="/admin/sources" className="inline-flex items-center gap-1 hover:text-on-surface">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            chevron_left
          </span>
          {sourcesMessages.breadcrumbSources}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-on-surface">{initialSource.displayName}</span>
      </nav>

      <header className="border-b border-outline-variant pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">
              {sourcesMessages.detailTitle(initialSource.displayName)}
            </h1>
            <p className="mt-1 text-[15px] text-secondary">{sourcesMessages.detailSubtitle}</p>
          </div>
          {initialSource.implementationStatus === 'live' ? (
            <button
              type="button"
              onClick={handleRunNow}
              className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                play_arrow
              </span>
              {sourcesMessages.runNow}
            </button>
          ) : (
            <span className="inline-flex rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-[14px]">
              {sourcesMessages.statusComingSoon}
            </span>
          )}
        </div>
      </header>

      {error ? (
        <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-error">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-on-surface">
          {sourcesMessages.saveSuccess}
        </p>
      ) : null}

      <div className="space-y-5 rounded border border-outline-variant bg-surface p-5 text-[15px]">
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <h2 className="font-semibold">{sourcesMessages.sourceStatusLabel}</h2>
            <p className="mt-1 text-secondary">{sourcesMessages.sourceStatusHelp}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="peer sr-only"
            />
            <span
              className="h-5 w-10 rounded-full bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-outline-variant after:bg-surface after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"
              aria-hidden
            />
          </label>
        </div>

        <div className="space-y-2 border-b border-outline-variant pb-4">
          <label className="block font-semibold">{sourcesMessages.intervalLabel}</label>
          <p className="text-[14px] text-secondary">{sourcesMessages.intervalHelp}</p>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center rounded border border-outline-variant bg-surface-container-low">
              <button
                type="button"
                onClick={decreaseInterval}
                className="rounded-l px-3 py-1 text-sm font-semibold hover:bg-surface-container-high"
              >
                -
              </button>
              <input
                type="number"
                min={30}
                max={1440}
                value={interval}
                onChange={(event) => setInterval(Number(event.target.value))}
                className="w-16 border-x border-outline-variant bg-surface py-1 text-center font-mono text-[14px] focus:outline-none"
              />
              <button
                type="button"
                onClick={increaseInterval}
                className="rounded-r px-3 py-1 text-sm font-semibold hover:bg-surface-container-high"
              >
                +
              </button>
            </div>
            <span className="font-mono text-[14px] text-secondary">
              {sourcesMessages.intervalEvery(interval)}
            </span>
          </div>
        </div>

        <div className="space-y-2 border-b border-outline-variant pb-4">
          <div className="flex items-center justify-between gap-2">
            <label className="block font-semibold">{sourcesMessages.urlsLabel}</label>
            <span className="font-mono text-[14px] text-secondary">{sourcesMessages.urlsHelp}</span>
          </div>
          <textarea
            rows={5}
            value={targetUrlsText}
            onChange={(event) => setTargetUrlsText(event.target.value)}
            className="max-h-48 w-full overflow-y-auto rounded border border-outline-variant bg-surface-container-low p-3 font-mono text-[14px] leading-relaxed focus:border-primary focus:outline-none"
            placeholder="https://www.subito.it/annunci-veneto/..."
          />
        </div>

        <div className="space-y-3 border-b border-outline-variant pb-4">
          <div>
            <label className="block font-semibold">{sourcesMessages.antiBlockLabel}</label>
            <p className="mt-1 text-[14px] text-secondary">{sourcesMessages.antiBlockHelp}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAntiBlock(preset.id)}
                className={cn(
                  'rounded border p-3 text-left transition-colors',
                  antiBlock === preset.id
                    ? 'border-primary bg-surface-container ring-1 ring-primary'
                    : 'border-outline-variant bg-surface hover:bg-surface-container-low',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{preset.title}</span>
                  <input
                    type="radio"
                    name="antiBlock"
                    checked={antiBlock === preset.id}
                    onChange={() => setAntiBlock(preset.id)}
                    className="accent-primary"
                  />
                </div>
                <p className="mt-1 text-[14px] text-secondary">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block font-semibold">{sourcesMessages.thresholdsLabel}</label>
            <p className="mt-1 text-[14px] text-secondary">{sourcesMessages.thresholdsHelp}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 font-mono text-[14px]">
              <span className="material-symbols-outlined text-[18px] text-on-surface" aria-hidden>
                check_circle
              </span>
              {sourcesMessages.thresholdSelector} ≥{formatThresholdPercent(SCRAPE_MIN_SELECTOR_RATE)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 font-mono text-[14px]">
              <span className="material-symbols-outlined text-[18px] text-on-surface" aria-hidden>
                check_circle
              </span>
              {sourcesMessages.thresholdCount} ≥{formatThresholdPercent(SCRAPE_MIN_COUNT_RATIO)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 font-mono text-[14px]">
              <span className="material-symbols-outlined text-[18px] text-on-surface" aria-hidden>
                check_circle
              </span>
              {sourcesMessages.thresholdGeo} ≥{formatThresholdPercent(SCRAPE_MIN_GEO_RESOLUTION_RATE)}
            </span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between rounded border border-outline-variant bg-surface p-4">
        <span className="text-[14px] text-secondary">{sourcesMessages.saveFooterNote}</span>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/sources"
            className="rounded border border-outline-variant bg-surface px-4 py-2 text-[14px] text-secondary hover:bg-surface-container-low"
          >
            {sourcesMessages.cancel}
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              save
            </span>
            {sourcesMessages.save}
          </button>
        </div>
      </div>
    </div>
  );
}
