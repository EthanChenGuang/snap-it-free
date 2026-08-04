'use client';

import { useState } from 'react';
import type { SourceWithLastRun } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type SourceCardProps = {
  source: SourceWithLastRun;
  globalPause: boolean;
  onToggleEnabled: (slug: string, enabled: boolean) => Promise<void>;
  onRunNow: (slug: string) => Promise<string | null>;
};

function formatUtcTimestamp(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function formatLastRunLine(source: SourceWithLastRun): string {
  const run = source.lastRun;
  if (!run) {
    return '上次运行：暂无记录';
  }

  const statusLabel =
    run.status === 'success' ? 'Success' : run.status === 'failed' ? 'Failed' : 'Partial';

  return `上次运行：${formatUtcTimestamp(run.finishedAt ?? run.startedAt)} · ${statusLabel} · ${run.listingsFound} listings`;
}

function statusChipLabel(source: SourceWithLastRun): string {
  if (source.implementationStatus === 'coming_soon') {
    return '即将支持';
  }
  if (!source.enabled) {
    return '已暂停';
  }
  return '运行中';
}

export function SourceCard({ source, globalPause, onToggleEnabled, onRunNow }: SourceCardProps) {
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const isComingSoon = source.implementationStatus === 'coming_soon';
  const toggleDisabled = isComingSoon || globalPause || toggling;
  const runDisabled = isComingSoon || globalPause || running;

  async function handleToggle() {
    if (toggleDisabled) {
      return;
    }
    setToggling(true);
    try {
      await onToggleEnabled(source.slug, !source.enabled);
    } finally {
      setToggling(false);
    }
  }

  async function handleRunNow() {
    if (runDisabled) {
      return;
    }
    setRunning(true);
    setRunMessage(null);
    try {
      const message = await onRunNow(source.slug);
      if (message) {
        setRunMessage(message);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <article
      className={cn(
        'flex flex-col rounded border border-outline-variant p-space-lg',
        isComingSoon ? 'bg-surface-container-low opacity-75' : 'bg-surface',
      )}
    >
      <div className="mb-space-md flex items-start justify-between gap-3">
        <div>
          <h3 className="text-h3 font-semibold text-primary">{source.displayName}</h3>
          <span className="mt-1 inline-flex rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-label-sm">
            {statusChipLabel(source)}
          </span>
        </div>

        <label
          className={cn(
            'relative inline-flex items-center',
            toggleDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={source.enabled}
            disabled={toggleDisabled}
            onChange={handleToggle}
            aria-label={`${source.displayName} 启用开关`}
          />
          <div
            className={cn(
              'h-6 w-10 rounded-full border border-outline-variant bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-outline-variant after:bg-on-primary after:transition-all after:content-[""] peer-checked:bg-primary peer-checked:after:translate-x-full peer-disabled:opacity-40',
              isComingSoon && 'bg-surface-container-highest after:bg-outline-variant',
            )}
          />
        </label>
      </div>

      {isComingSoon ? (
        <p className="mt-auto text-label-sm italic text-secondary">该数据源尚未接入</p>
      ) : (
        <>
          <div className="mb-space-lg space-y-1 font-mono text-label-sm text-secondary">
            <p>
              频率：每 <span className="font-semibold text-primary">{source.intervalMinutes}</span>{' '}
              分钟
            </p>
            <p className="text-on-surface">{formatLastRunLine(source)}</p>
          </div>

          <div className="mt-auto space-y-2">
            {runMessage && (
              <p className="text-label-sm text-secondary" role="status">
                {runMessage}
              </p>
            )}
            <button
              type="button"
              disabled={runDisabled}
              onClick={handleRunNow}
              className="w-full rounded bg-primary px-4 py-2 text-label-md font-semibold text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
            >
              {running ? '提交中…' : '立即运行'}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
