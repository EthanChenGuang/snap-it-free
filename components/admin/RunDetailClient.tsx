'use client';

import Link from 'next/link';
import {
  runDetailMessages,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import {
  formatDuration,
  formatRomeTooltip,
  formatSelectorRate,
  formatUtcTimestamp,
  formatWallTimeSeconds,
  categoryUrlLabel,
} from '@/lib/admin/format';
import {
  isPreCrawlSkip,
  localizeFailureReason,
  resolveRunDetailStatusLabel,
  resolveRunOutcomeExplanation,
} from '@/lib/admin/run-status';
import type { ScrapeRunDetail, ScrapeRunTrigger } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RunDetailClientProps = {
  run: ScrapeRunDetail;
};

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

function triggerLabel(trigger: ScrapeRunTrigger | null): string {
  if (trigger === 'cron') {
    return runDetailMessages.triggerCron;
  }
  if (trigger === 'manual') {
    return runDetailMessages.triggerManual;
  }
  return runDetailMessages.triggerUnknown;
}

function logExcerptForRun(run: ScrapeRunDetail): string | null {
  const localizedReason = localizeFailureReason(run.failureReason);
  if (localizedReason) {
    return localizedReason;
  }
  if (run.degraded) {
    return runDetailMessages.logDegraded;
  }
  if (run.status === 'success' && run.finishedAt) {
    return null;
  }
  return '运行未完成，无详细日志。';
}

function FunnelStep({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-[72px] space-y-1 text-center">
      <p className="text-[12px] font-medium uppercase tracking-wide text-secondary">{label}</p>
      <p className={cn('font-mono text-[20px] font-bold', emphasize && 'text-primary')}>{value}</p>
    </div>
  );
}

export function RunDetailClient({ run }: RunDetailClientProps) {
  const crawlModeLabel =
    run.crawlMode === 'full'
      ? runDetailMessages.crawlModeFull
      : run.crawlMode === 'incremental'
        ? runDetailMessages.crawlModeIncremental
        : '—';

  const duration = formatDuration(run.startedAt, run.finishedAt);
  const wallTime = formatWallTimeSeconds(run.wallTimeSeconds);
  const detailStatusLabel = resolveRunDetailStatusLabel(run);
  const outcomeExplanation = resolveRunOutcomeExplanation(run);
  const preCrawlSkip = isPreCrawlSkip(run);
  const logExcerpt = logExcerptForRun(run);
  const urlRows =
    run.urlBreakdown.length > 0
      ? run.urlBreakdown
      : run.targetUrlsSnapshot.map((url) => ({
          url,
          label: categoryUrlLabel(url),
          listingsFound: 0,
          listingsSkippedAtCrawl: 0,
          blocked: false,
          earlyStopTriggered: false,
        }));

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
                {detailStatusLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[12px] font-semibold">
                {crawlModeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[12px] font-semibold">
                {triggerLabel(run.triggerType)}
              </span>
              {run.degraded ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[12px] font-semibold text-secondary">
                  {runDetailMessages.degradedChip}
                </span>
              ) : null}
            </div>
            <p
              className="mt-1 font-mono text-[14px] text-secondary"
              title={formatRomeTooltip(run.startedAt)}
            >
              {runDetailMessages.timeRange(
                formatUtcTimestamp(run.startedAt),
                run.finishedAt ? formatUtcTimestamp(run.finishedAt) : null,
                duration,
              )}
            </p>
            {run.jobId ? (
              <p className="mt-1 font-mono text-[13px] text-secondary">
                {runDetailMessages.jobLink}: {run.jobId.slice(0, 8)}…
              </p>
            ) : null}
            {outcomeExplanation ? (
              <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-secondary">
                {outcomeExplanation}
              </p>
            ) : null}
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

      <section className="rounded border border-outline-variant bg-surface p-4">
        <h2 className="text-[14px] font-semibold uppercase tracking-wide text-secondary">
          {runDetailMessages.funnelTitle}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          <FunnelStep label={runDetailMessages.funnelFound} value={run.listingsFound} emphasize />
          <span className="text-secondary" aria-hidden>
            →
          </span>
          <FunnelStep label={runDetailMessages.funnelCrawlSkipped} value={run.listingsSkippedAtCrawl} />
          <span className="text-secondary" aria-hidden>
            →
          </span>
          <FunnelStep label={runDetailMessages.funnelInserted} value={run.listingsInserted} emphasize />
          <span className="text-secondary" aria-hidden>
            /
          </span>
          <FunnelStep label={runDetailMessages.funnelUpdated} value={run.listingsUpdated} />
          <span className="text-secondary" aria-hidden>
            /
          </span>
          <FunnelStep label={runDetailMessages.funnelPersistSkipped} value={run.listingsSkipped} />
          <span className="text-secondary" aria-hidden>
            /
          </span>
          <FunnelStep label={runDetailMessages.funnelRejected} value={run.listingsRejected} />
        </div>
      </section>

      <section className="rounded border border-outline-variant bg-surface p-4">
        <h2 className="text-[14px] font-semibold uppercase tracking-wide text-secondary">
          {runDetailMessages.qualityTitle}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: runDetailMessages.metricSelectorRate,
              value: formatSelectorRate(run.selectorHitRate),
            },
            {
              label: runDetailMessages.metricJsonCompleteness,
              value: formatSelectorRate(run.jsonFieldCompleteness),
            },
            { label: runDetailMessages.metricHttpRequests, value: run.httpRequests ?? 0 },
            {
              label: runDetailMessages.metricBlockedUrls,
              value: `${run.blockedUrlCount}${run.targetUrlsSnapshot.length ? ` / ${run.targetUrlsSnapshot.length}` : ''}`,
            },
            { label: runDetailMessages.metricWallTime, value: wallTime },
          ].map((metric) => (
            <div key={metric.label} className="space-y-1">
              <p className="text-[13px] font-medium uppercase tracking-wide text-secondary">
                {metric.label}
              </p>
              <p className="font-mono text-[20px] font-bold">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <h2 className="text-[14px] font-semibold uppercase tracking-wide">
            {runDetailMessages.urlBreakdownTitle}
          </h2>
        </div>
        {urlRows.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-secondary">{runDetailMessages.urlBreakdownEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-outline-variant text-[13px] font-semibold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-4 py-2">{runDetailMessages.urlColumnLabel}</th>
                  <th className="px-4 py-2 text-right">{runDetailMessages.urlColumnFound}</th>
                  <th className="px-4 py-2 text-right">{runDetailMessages.urlColumnCrawlSkipped}</th>
                  <th className="px-4 py-2">{runDetailMessages.urlColumnStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {urlRows.map((row) => (
                  <tr key={row.url} className="hover:bg-surface-container-low">
                    <td className="px-4 py-2">
                      <p className="font-medium capitalize text-on-surface">{row.label}</p>
                      <p className="mt-0.5 max-w-md truncate font-mono text-[12px] text-secondary" title={row.url}>
                        {row.url}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{row.listingsFound}</td>
                    <td className="px-4 py-2 text-right font-mono text-secondary">
                      {row.listingsSkippedAtCrawl}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[12px] font-medium',
                            preCrawlSkip
                              ? 'border-outline-variant bg-surface-container-high text-secondary'
                              : row.blocked
                                ? 'border-outline-variant bg-error-container text-on-error-container'
                                : 'border-outline-variant bg-surface-container text-on-surface',
                          )}
                        >
                          {preCrawlSkip
                            ? runDetailMessages.urlStatusNotRun
                            : row.blocked
                              ? runDetailMessages.urlStatusBlocked
                              : runDetailMessages.urlStatusOk}
                        </span>
                        {row.earlyStopTriggered ? (
                          <span className="inline-flex rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[12px] font-medium text-secondary">
                            {runDetailMessages.urlEarlyStop}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {logExcerpt ? (
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
      ) : null}

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
