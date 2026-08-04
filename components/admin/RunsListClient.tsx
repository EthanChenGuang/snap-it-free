'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  runsMessages,
  SOURCE_SLUGS,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import {
  formatRomeTooltip,
  formatSelectorRate,
  formatUtcTimestamp,
} from '@/lib/admin/format';
import type { ScrapeRunListItem, ScrapeRunStatus } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RunsListClientProps = {
  initialRuns: ScrapeRunListItem[];
};

function runStatusLabel(run: ScrapeRunListItem): string {
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

function statusChipClass(status: ScrapeRunStatus, running: boolean): string {
  if (running) {
    return 'border-outline-variant bg-surface-container text-secondary';
  }
  if (status === 'success') {
    return 'border-outline-variant bg-surface-container text-on-surface';
  }
  if (status === 'partial') {
    return 'border-outline-variant bg-surface-container-high text-secondary';
  }
  return 'border-outline-variant bg-error-container text-on-error-container';
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-surface-container-high" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function RunsListClient({ initialRuns }: RunsListClientProps) {
  const [selectedSource, setSelectedSource] = useState('');
  const [loading] = useState(false);

  const filteredRuns = useMemo(() => {
    if (!selectedSource) {
      return initialRuns;
    }
    return initialRuns.filter((run) => run.source === selectedSource);
  }, [initialRuns, selectedSource]);

  const isEmpty = filteredRuns.length === 0;

  return (
    <div className="space-y-6">
      <header className="border-b border-outline-variant pb-6">
        <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">
          {runsMessages.pageTitle}
        </h1>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-outline-variant bg-surface-container-low p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden>
            filter_list
          </span>
          <select
            value={selectedSource}
            onChange={(event) => setSelectedSource(event.target.value)}
            className="rounded border border-outline-variant bg-surface px-3 py-1.5 text-[14px] text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">{runsMessages.filterAllSources}</option>
            {SOURCE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {sourceDisplayNames[slug] ?? slug}
              </option>
            ))}
          </select>
        </div>
        <span className="rounded border border-outline-variant bg-surface-container px-2 py-0.5 font-mono text-[13px] text-secondary">
          {runsMessages.runCount(filteredRuns.length)}
        </span>
      </div>

      {isEmpty && !loading ? (
        <div className="flex flex-col items-center justify-center rounded border border-outline-variant bg-surface px-6 py-16 text-center">
          <span className="material-symbols-outlined mb-4 text-[48px] text-secondary" aria-hidden>
            history
          </span>
          <h2 className="text-[20px] font-semibold text-on-surface">{runsMessages.emptyHeading}</h2>
          <p className="mt-2 max-w-md text-[15px] text-secondary">{runsMessages.emptyBody}</p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:opacity-90"
          >
            {runsMessages.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-outline-variant bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px] text-on-surface">
              <thead className="border-b border-outline-variant bg-surface-container-low text-[14px] font-semibold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-4 py-3">{runsMessages.tableStarted}</th>
                  <th className="px-4 py-3">{runsMessages.tableSource}</th>
                  <th className="px-4 py-3">{runsMessages.tableStatus}</th>
                  <th className="px-4 py-3 text-right">{runsMessages.tableFound}</th>
                  <th className="px-4 py-3 text-right">{runsMessages.tableInserted}</th>
                  <th className="px-4 py-3 text-right">{runsMessages.tableRejected}</th>
                  <th className="px-4 py-3 text-right">{runsMessages.tableSelectorRate}</th>
                  <th className="px-4 py-3 text-right">{runsMessages.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <SkeletonRows />
                ) : (
                  filteredRuns.map((run) => {
                    const running = !run.finishedAt;
                    return (
                      <tr key={run.id} className="hover:bg-surface-container-low">
                        <td
                          className="px-4 py-3 font-mono text-[14px] text-secondary"
                          title={formatRomeTooltip(run.startedAt)}
                        >
                          {formatUtcTimestamp(run.startedAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {sourceDisplayNames[run.source] ?? run.source}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-medium',
                              statusChipClass(run.status, running),
                            )}
                          >
                            {running ? (
                              <span
                                className="material-symbols-outlined animate-spin text-[14px]"
                                aria-hidden
                              >
                                progress_activity
                              </span>
                            ) : null}
                            {runStatusLabel(run)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{run.listingsFound}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {run.listingsInserted}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-secondary">
                          {run.listingsRejected}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatSelectorRate(run.selectorHitRate)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/runs/${run.id}`}
                            className="inline-flex items-center gap-1 rounded border border-outline-variant bg-surface px-2.5 py-1 text-[14px] hover:bg-surface-container-low"
                          >
                            {runsMessages.viewDetail}
                            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden>
                              chevron_right
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
