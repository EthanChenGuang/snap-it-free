'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  runDetailMessages,
  runsMasterDetailMessages,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import {
  formatDuration,
  formatRomeTooltip,
  formatSelectorRate,
  formatUtcTimestamp,
  formatWallTimeSeconds,
} from '@/lib/admin/format';
import {
  isPreCrawlSkip,
  resolveRunDetailStatusLabel,
  resolveRunOutcomeExplanation,
} from '@/lib/admin/run-status';
import type { ScrapeRunDetail, ScrapeRunTrigger } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RunDetailPanelProps = {
  run: ScrapeRunDetail;
  loading?: boolean;
};

function triggerLabel(trigger: ScrapeRunTrigger | null): string {
  if (trigger === 'cron') {
    return runDetailMessages.triggerCron;
  }
  if (trigger === 'manual') {
    return runDetailMessages.triggerManual;
  }
  return runDetailMessages.triggerUnknown;
}

function crawlModeLabel(crawlMode: ScrapeRunDetail['crawlMode']): string {
  if (crawlMode === 'full') {
    return runDetailMessages.crawlModeFull;
  }
  if (crawlMode === 'incremental') {
    return runDetailMessages.crawlModeIncremental;
  }
  return runDetailMessages.crawlModeUnknown;
}

function statusBadgeClass(run: ScrapeRunDetail): string {
  if (!run.finishedAt) {
    return 'runs-badge-running';
  }
  if (run.status === 'success') {
    return 'runs-badge-success';
  }
  if (run.status === 'partial') {
    return 'runs-badge-partial';
  }
  return 'runs-badge-failed';
}

function buildLogContent(run: ScrapeRunDetail): string {
  const lines: string[] = [];
  const statusLabel = resolveRunDetailStatusLabel(run);
  const explanation = resolveRunOutcomeExplanation(run);

  lines.push(`[status] ${statusLabel}`);
  if (explanation) {
    lines.push(`[reason] ${explanation}`);
  }
  if (run.failureReason?.trim()) {
    lines.push(`[raw] ${run.failureReason.trim()}`);
  }
  if (run.degraded) {
    lines.push(`[mode] ${runDetailMessages.logDegraded}`);
  }
  lines.push('');
  lines.push(`source: ${run.source}`);
  lines.push(`trigger: ${triggerLabel(run.triggerType)}`);
  lines.push(`crawl_mode: ${run.crawlMode ?? '—'}`);
  lines.push(`started: ${formatUtcTimestamp(run.startedAt)}`);
  lines.push(`finished: ${run.finishedAt ? formatUtcTimestamp(run.finishedAt) : '—'}`);
  lines.push(`listings_found: ${run.listingsFound}`);
  lines.push(`listings_inserted: ${run.listingsInserted}`);
  lines.push(`listings_rejected: ${run.listingsRejected}`);
  lines.push(`http_requests: ${run.httpRequests ?? 0}`);
  lines.push(`selector_hit_rate: ${formatSelectorRate(run.selectorHitRate)}`);
  if (run.jobId) {
    lines.push(`job_id: ${run.jobId}`);
  }

  if (run.status === 'success' && !run.failureReason) {
    return runDetailMessages.logSuccess;
  }

  return lines.join('\n');
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="runs-metric-card">
      <p className="runs-metric-label">{label}</p>
      <p className="runs-metric-value tabular-nums">{value}</p>
    </div>
  );
}

export function RunDetailPanel({ run, loading }: RunDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const detailStatusLabel = resolveRunDetailStatusLabel(run);
  const outcomeExplanation = resolveRunOutcomeExplanation(run);
  const duration =
    run.wallTimeSeconds != null && Number.isFinite(run.wallTimeSeconds)
      ? formatWallTimeSeconds(run.wallTimeSeconds)
      : formatDuration(run.startedAt, run.finishedAt);
  const logContent = buildLogContent(run);
  const preCrawlSkip = isPreCrawlSkip(run);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(logContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [logContent]);

  if (loading) {
    return (
      <div className="runs-detail-panel flex h-full flex-col">
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-6 w-48 rounded bg-black/[0.06]" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[10px] bg-black/[0.06]" />
            ))}
          </div>
          <div className="h-48 rounded-[10px] bg-black/[0.06]" />
        </div>
      </div>
    );
  }

  return (
    <div className="runs-detail-panel flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-black/[0.08] px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                {sourceDisplayNames[run.source] ?? run.source}
              </h2>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium leading-none',
                  statusBadgeClass(run),
                )}
              >
                {detailStatusLabel}
              </span>
              <span className="runs-meta-chip whitespace-nowrap">{triggerLabel(run.triggerType)}</span>
              <span className="runs-meta-chip whitespace-nowrap">{crawlModeLabel(run.crawlMode)}</span>
              {run.degraded ? (
                <span className="runs-meta-chip whitespace-nowrap">{runDetailMessages.degradedChip}</span>
              ) : null}
            </div>
            <p
              className="mt-1 font-mono text-[12px] tabular-nums text-[#86868b]"
              title={formatRomeTooltip(run.startedAt)}
            >
              {runDetailMessages.timeRange(
                formatUtcTimestamp(run.startedAt),
                run.finishedAt ? formatUtcTimestamp(run.finishedAt) : null,
                duration,
              )}
            </p>
          </div>
          <Link href={`/admin/sources/${run.source}`} className="runs-toolbar-btn shrink-0 whitespace-nowrap">
            {runDetailMessages.sourceConfig}
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label={runsMasterDetailMessages.metricFound} value={run.listingsFound} />
          <MetricCard label={runsMasterDetailMessages.metricInserted} value={run.listingsInserted} />
          <MetricCard label={runsMasterDetailMessages.metricRejected} value={run.listingsRejected} />
          <MetricCard label={runsMasterDetailMessages.metricDuration} value={duration} />
        </div>

        {outcomeExplanation ? (
          <section className="mt-4 rounded-[10px] border border-black/[0.08] bg-white px-4 py-3">
            <p className="text-[13px] font-medium text-[#1d1d1f]">{detailStatusLabel}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#636366]">{outcomeExplanation}</p>
          </section>
        ) : null}

        <section className="mt-4 overflow-hidden rounded-[10px] border border-black/[0.08] bg-white">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#86868b]">
              {runsMasterDetailMessages.logTitle}
            </h3>
            <button type="button" onClick={handleCopy} className="runs-copy-btn">
              {copied ? runsMasterDetailMessages.copied : runsMasterDetailMessages.copyLog}
            </button>
          </div>
          <pre className="runs-log-block max-h-[min(420px,50vh)] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed tabular-nums">
            {logContent}
          </pre>
        </section>

        {run.urlBreakdown.length > 0 || run.targetUrlsSnapshot.length > 0 ? (
          <details className="mt-4 overflow-hidden rounded-[10px] border border-black/[0.08] bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-medium text-[#1d1d1f]">
              {runDetailMessages.urlBreakdownTitle}
              <span className="ml-2 font-mono text-[12px] tabular-nums text-[#86868b]">
                ({run.urlBreakdown.length || run.targetUrlsSnapshot.length})
              </span>
            </summary>
            <div className="max-h-64 overflow-y-auto border-t border-black/[0.06]">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-[#fafafa] text-[11px] font-medium uppercase tracking-wide text-[#86868b]">
                  <tr>
                    <th className="px-4 py-2">{runDetailMessages.urlColumnLabel}</th>
                    <th className="px-4 py-2 text-right tabular-nums">{runDetailMessages.urlColumnFound}</th>
                    <th className="px-4 py-2">{runDetailMessages.urlColumnStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {(run.urlBreakdown.length > 0
                    ? run.urlBreakdown
                    : run.targetUrlsSnapshot.map((url) => ({
                        url,
                        label: url,
                        listingsFound: 0,
                        listingsSkippedAtCrawl: 0,
                        blocked: false,
                        earlyStopTriggered: false,
                      }))
                  ).map((row) => (
                    <tr key={row.url}>
                      <td className="max-w-[240px] truncate px-4 py-2 text-[#1d1d1f]">{row.label}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{row.listingsFound}</td>
                      <td className="px-4 py-2">
                        <span className="runs-meta-chip whitespace-nowrap">
                          {preCrawlSkip
                            ? runDetailMessages.urlStatusNotRun
                            : row.blocked
                              ? runDetailMessages.urlStatusBlocked
                              : runDetailMessages.urlStatusOk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}

        {run.listingsRejected > 0 ? (
          <Link href={`/admin/rejects?run_id=${run.id}`} className="mt-4 inline-flex text-[13px] text-[#007aff] hover:underline">
            {runDetailMessages.rejectsLink}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function RunDetailEmptyState() {
  return (
    <div className="runs-detail-panel flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-[#86868b]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-[15px] font-medium text-[#1d1d1f]">{runsMasterDetailMessages.selectRunTitle}</p>
      <p className="mt-1 max-w-sm text-[13px] text-[#86868b]">{runsMasterDetailMessages.selectRunBody}</p>
    </div>
  );
}

export { RunDetailEmptyState };
