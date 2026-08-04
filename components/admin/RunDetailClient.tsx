'use client';

import Link from 'next/link';
import {
  runDetailMessages,
  runsMessages,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import {
  formatRomeTooltip,
  formatSelectorRate,
  formatUtcTimestamp,
} from '@/lib/admin/format';
import type { ScrapeRunDetail } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RunDetailClientProps = {
  run: ScrapeRunDetail;
};

function runStatusLabel(run: ScrapeRunDetail): string {
  if (!run.finishedAt) {
    return runsMessages.statusRunning;
  }
  if (run.status === 'success') {
    return runsMessages.statusSuccess;
  }
  if (run.status === 'partial') {
    return runsMessages.statusPartial;
  }
  return runsMessages.statusFailed;
}

function statusChipClass(run: ScrapeRunDetail): string {
  if (!run.finishedAt) {
    return 'border-outline-variant bg-surface-container text-secondary';
  }
  if (run.status === 'success') {
    return 'border-outline-variant bg-surface-container text-on-surface';
  }
  if (run.status === 'partial') {
    return 'border-outline-variant bg-surface-container-high text-secondary';
  }
  return 'border-outline-variant bg-error-container text-on-error-container';
}

export function RunDetailClient({ run }: RunDetailClientProps) {
  const logExcerpt =
    run.failureReason?.trim() ||
    (run.status === 'success' ? runDetailMessages.logSuccess : '运行未完成，无详细日志。');

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-[14px] text-secondary">
        <Link
          href="/admin/runs"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            chevron_left
          </span>
          {runDetailMessages.breadcrumbRuns}
        </Link>
        <span>/</span>
        <span className="font-semibold text-on-surface">{runDetailMessages.runLabel(run.id)}</span>
      </nav>

      <header className="border-b border-outline-variant pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">
                {sourceDisplayNames[run.source] ?? run.source} {runDetailMessages.pageTitle}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-medium',
                  statusChipClass(run),
                )}
              >
                {runStatusLabel(run)}
              </span>
            </div>
            <p
              className="mt-1 font-mono text-[14px] text-secondary"
              title={formatRomeTooltip(run.startedAt)}
            >
              {formatUtcTimestamp(run.startedAt)}
            </p>
          </div>
          <Link
            href={`/admin/sources/${run.source}`}
            className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 py-1.5 text-[14px] hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden>
              settings
            </span>
            {runDetailMessages.sourceConfig}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: runDetailMessages.metricFound, value: run.listingsFound },
          { label: runDetailMessages.metricInserted, value: run.listingsInserted },
          { label: runDetailMessages.metricRejected, value: run.listingsRejected },
          {
            label: runDetailMessages.metricSelectorRate,
            value: formatSelectorRate(run.selectorHitRate),
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="space-y-1 rounded border border-outline-variant bg-surface p-4"
          >
            <p className="text-[13px] font-medium uppercase tracking-wide text-secondary">
              {metric.label}
            </p>
            <p className="font-mono text-[24px] font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden>
              terminal
            </span>
            <h2 className="text-[14px] font-semibold uppercase tracking-wide">
              {runDetailMessages.logSection}
            </h2>
          </div>
        </div>
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap bg-[#202020] p-4 font-mono text-[13px] leading-relaxed text-[#f1f1f1]">
          {logExcerpt}
        </pre>
      </section>

      {run.listingsRejected > 0 ? (
        <Link
          href={`/admin/rejects?run_id=${run.id}`}
          className="inline-flex items-center gap-1 text-[14px] font-medium text-primary underline hover:opacity-80"
        >
          {runDetailMessages.rejectsLink}
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            open_in_new
          </span>
        </Link>
      ) : null}
    </div>
  );
}
