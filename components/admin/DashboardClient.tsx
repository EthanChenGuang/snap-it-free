'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SourceCard } from '@/components/admin/SourceCard';
import { adminShellMessages } from '@/components/admin/admin-messages';
import type { AdminAlert, GlobalAdminStatus, SourceWithLastRun } from '@/lib/admin/types';

type DashboardClientProps = {
  initialSources: SourceWithLastRun[];
  initialGlobalStatus: GlobalAdminStatus;
  initialAlerts: AdminAlert[];
  pendingTranslationCount: number;
};

function formatUtcTimestamp(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export function DashboardClient({
  initialSources,
  initialGlobalStatus,
  initialAlerts,
  pendingTranslationCount,
}: DashboardClientProps) {
  const router = useRouter();
  const [globalPause, setGlobalPause] = useState(initialGlobalStatus.globalPause);
  const lastSyncAt = initialGlobalStatus.lastSyncAt;
  const [sources, setSources] = useState(initialSources);
  const [pauseSaving, setPauseSaving] = useState(false);

  const orderedSources = [...sources].sort((a, b) => {
    if (a.slug === 'subito') return -1;
    if (b.slug === 'subito') return 1;
    return a.slug.localeCompare(b.slug);
  });

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

      const payload = (await response.json()) as {
        config: { global_pause: boolean };
      };
      setGlobalPause(payload.config.global_pause);
      router.refresh();
    } finally {
      setPauseSaving(false);
    }
  }, [globalPause, router]);

  const handleToggleEnabled = useCallback(
    async (slug: string, enabled: boolean) => {
      const response = await fetch(`/api/admin/sources/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        return;
      }

      setSources((current) =>
        current.map((source) => (source.slug === slug ? { ...source, enabled } : source)),
      );
      router.refresh();
    },
    [router],
  );

  const handleRunNow = useCallback(
    async (slug: string): Promise<string | null> => {
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_slug: slug }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        return payload.error ?? '无法提交运行任务';
      }

      router.refresh();
      return payload.message ?? null;
    },
    [router],
  );

  return (
    <>
      <header className="mb-6 border-b border-outline-variant pb-6">
        <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">抓取管理</h1>
        <p className="mt-1 text-[15px] text-secondary">Scraper Worker · Admin Console</p>
      </header>

      <section className="mb-space-xl flex flex-wrap items-center justify-between gap-4 rounded border border-outline-variant bg-surface p-space-md">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <div className="relative">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={globalPause}
                disabled={pauseSaving}
                onChange={handleGlobalPauseToggle}
                aria-label="全局暂停"
              />
              <div className="h-6 w-10 rounded-full border border-outline-variant bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-outline-variant after:bg-primary after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:bg-surface-dim peer-disabled:opacity-50" />
            </div>
            <span className="text-label-md font-semibold text-primary">全局暂停</span>
          </label>

          <div className="hidden h-6 w-px bg-outline-variant sm:block" aria-hidden />

          <p className="text-label-sm text-secondary">
            上次同步：
            <span className="font-medium text-primary">{formatUtcTimestamp(lastSyncAt)}</span>
          </p>
        </div>

        {pendingTranslationCount > 0 && (
          <Link
            href="/admin/translation"
            className="text-label-sm text-primary underline decoration-outline-variant underline-offset-4 hover:decoration-primary"
          >
            待翻译：{pendingTranslationCount}
          </Link>
        )}
      </section>

      <section className="mb-space-xl">
        <h2 className="mb-space-md border-b border-outline-variant pb-2 text-h3 font-semibold">
          数据源
        </h2>

        <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-2 xl:grid-cols-3">
          {orderedSources.map((source) => (
            <SourceCard
              key={source.slug}
              source={source}
              globalPause={globalPause}
              onToggleEnabled={handleToggleEnabled}
              onRunNow={handleRunNow}
            />
          ))}
        </div>
      </section>

      <section className="mb-space-xl space-y-3">
        <h2 className="border-b border-outline-variant pb-2 text-h3 font-semibold">最近告警</h2>
        {initialAlerts.length === 0 ? (
          <p className="rounded border border-dashed border-outline-variant bg-surface-container-low p-4 text-body-md text-secondary">
            暂无告警记录。
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant rounded border border-outline-variant bg-surface">
            {initialAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-center gap-3 p-space-md text-body-md"
              >
                <span className="material-symbols-outlined shrink-0 text-[20px] text-error" aria-hidden>
                  error
                </span>
                <span className="shrink-0 font-mono font-semibold">{alert.source}</span>
                <span className="max-w-md truncate text-error">{alert.message}</span>
                <span className="ml-auto shrink-0 font-mono text-label-sm text-secondary">
                  {formatUtcTimestamp(alert.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 h-16 animate-pulse rounded bg-surface-container-low" />
      <div className="mb-space-xl h-14 animate-pulse rounded bg-surface-container-low" />
      <div className="mb-space-xl grid grid-cols-1 gap-space-lg lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded bg-surface-container-low" />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded bg-surface-container-low" />
    </>
  );
}

export function DashboardLoadError() {
  return (
    <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-body-md text-error">
      {adminShellMessages.loadError}
    </p>
  );
}
