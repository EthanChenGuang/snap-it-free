'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  adminShellMessages,
  antiBlockPresetLabels,
  sourcesMessages,
} from '@/components/admin/admin-messages';
import type { SourceWithLastRun } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type SourcesListClientProps = {
  initialSources: SourceWithLastRun[];
};

function formatUtcTimestamp(iso: string | null): string {
  if (!iso) {
    return sourcesMessages.lastRunNone;
  }
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function formatLastRun(source: SourceWithLastRun): string {
  const run = source.lastRun;
  if (!run) {
    return sourcesMessages.lastRunNone;
  }

  const statusLabel =
    run.status === 'success' ? 'Success' : run.status === 'failed' ? 'Failed' : 'Partial';

  return `${formatUtcTimestamp(run.finishedAt ?? run.startedAt)} · ${statusLabel} · ${run.listingsFound} listings`;
}

function statusLabel(source: SourceWithLastRun): string {
  if (source.implementationStatus === 'coming_soon') {
    return sourcesMessages.statusComingSoon;
  }
  if (!source.enabled) {
    return sourcesMessages.statusPaused;
  }
  return sourcesMessages.statusRunning;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {Array.from({ length: 7 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-surface-container-high" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SourcesListClient({ initialSources }: SourcesListClientProps) {
  const [sources, setSources] = useState(initialSources);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSlug, setActionSlug] = useState<string | null>(null);

  const refreshSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/sources');
      if (!response.ok) {
        throw new Error('load failed');
      }
      const payload = (await response.json()) as { sources: SourceWithLastRun[] };
      setSources(payload.sources);
    } catch {
      setError(adminShellMessages.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = async (slug: string, enabled: boolean) => {
    setActionSlug(slug);
    try {
      const response = await fetch(`/api/admin/sources/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error('toggle failed');
      }
      setSources((prev) =>
        prev.map((source) => (source.slug === slug ? { ...source, enabled } : source)),
      );
    } catch {
      setError(adminShellMessages.loadError);
    } finally {
      setActionSlug(null);
    }
  };

  const handleRunNow = async (source: SourceWithLastRun) => {
    if (source.implementationStatus === 'coming_soon') {
      return;
    }

    setActionSlug(source.slug);
    try {
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_slug: source.slug }),
      });
      if (!response.ok) {
        throw new Error('run failed');
      }
    } catch {
      setError(adminShellMessages.loadError);
    } finally {
      setActionSlug(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-outline-variant pb-6">
        <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">{sourcesMessages.pageTitle}</h1>
        <p className="mt-1 text-[15px] text-secondary">{sourcesMessages.sectionHeading}</p>
      </header>

      {error ? (
        <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-error">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px] text-on-surface">
            <thead className="border-b border-outline-variant bg-surface-container-low text-[14px] font-semibold uppercase tracking-wide text-secondary">
              <tr>
                <th className="px-4 py-3">{sourcesMessages.tableSource}</th>
                <th className="px-4 py-3">{sourcesMessages.tableStatus}</th>
                <th className="px-4 py-3">{sourcesMessages.tableEnabled}</th>
                <th className="px-4 py-3">{sourcesMessages.tableInterval}</th>
                <th className="px-4 py-3">{sourcesMessages.tableAntiBlock}</th>
                <th className="px-4 py-3">{sourcesMessages.tableLastRun}</th>
                <th className="px-4 py-3 text-right">{sourcesMessages.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <SkeletonRows />
              ) : (
                sources.map((source) => {
                  const isLive = source.implementationStatus === 'live';
                  const isBusy = actionSlug === source.slug;

                  return (
                    <tr key={source.slug} className="hover:bg-surface-container-low">
                      <td className="px-4 py-3 font-semibold">{source.displayName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[14px]">
                          {statusLabel(source)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={source.enabled}
                            disabled={!isLive || isBusy}
                            onChange={() => handleToggle(source.slug, !source.enabled)}
                            className="peer sr-only"
                          />
                          <span
                            className={cn(
                              'h-4 w-7 rounded-full bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:border after:border-outline-variant after:bg-surface after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-disabled:opacity-40',
                            )}
                            aria-hidden
                          />
                        </label>
                      </td>
                      <td className="px-4 py-3 font-mono text-secondary">
                        {sourcesMessages.intervalEvery(source.intervalMinutes)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded border border-outline-variant bg-surface-container px-2 py-0.5 text-[14px]">
                          <span className="material-symbols-outlined text-[16px]" aria-hidden>
                            shield
                          </span>
                          {antiBlockPresetLabels[source.antiBlockPreset] ?? source.antiBlockPreset}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[14px] text-secondary">
                        {formatLastRun(source)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLive ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRunNow(source)}
                              className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[14px] font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                                play_arrow
                              </span>
                              {sourcesMessages.runNow}
                            </button>
                          ) : null}
                          <Link
                            href={`/admin/sources/${source.slug}`}
                            className="inline-flex items-center gap-1 rounded border border-outline-variant bg-surface px-2.5 py-1 text-[14px] text-on-surface hover:bg-surface-container-low"
                          >
                            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden>
                              settings
                            </span>
                            {sourcesMessages.edit}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        onClick={() => refreshSources()}
        className="text-[14px] text-secondary underline hover:text-on-surface"
      >
        刷新列表
      </button>
    </div>
  );
}
