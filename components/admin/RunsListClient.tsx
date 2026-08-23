'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RunDetailEmptyState, RunDetailPanel } from '@/components/admin/RunDetailPanel';
import {
  runsMasterDetailMessages,
  runsMessages,
  SOURCE_SLUGS,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import { parseRunsListFilter, type RunsListFilter } from '@/lib/admin/dashboard-links';
import {
  formatDuration,
  formatRomeTooltip,
  formatUtcTimestamp,
  formatWallTimeSeconds,
} from '@/lib/admin/format';
import { resolveRunStatusLabel } from '@/lib/admin/run-status';
import type { ScrapeRunDetail, ScrapeRunListItem, ScrapeRunStatus } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RunsListClientProps = {
  initialRuns: ScrapeRunListItem[];
  initialSelectedId?: string | null;
  initialSinceDays?: number;
  initialQuickFilter?: RunsListFilter | null;
};

type QuickFilter = 'all' | RunsListFilter;

function durationLabel(run: ScrapeRunListItem): string {
  if (run.wallTimeSeconds != null && Number.isFinite(run.wallTimeSeconds)) {
    return formatWallTimeSeconds(run.wallTimeSeconds);
  }
  return formatDuration(run.startedAt, run.finishedAt);
}

function statusBadgeClass(status: ScrapeRunStatus, running: boolean): string {
  if (running) {
    return 'runs-badge-running';
  }
  if (status === 'success') {
    return 'runs-badge-success';
  }
  if (status === 'partial') {
    return 'runs-badge-partial';
  }
  return 'runs-badge-failed';
}

function CompactSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className="runs-compact-select"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: QuickFilter;
  onChange: (value: QuickFilter) => void;
}) {
  const segments: { value: QuickFilter; label: string }[] = [
    { value: 'all', label: runsMasterDetailMessages.segmentAll },
    { value: 'failed', label: runsMasterDetailMessages.segmentFailed },
    { value: 'partial', label: runsMasterDetailMessages.segmentSkipped },
  ];

  return (
    <div className="runs-segmented" role="tablist" aria-label={runsMasterDetailMessages.segmentLabel}>
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          role="tab"
          aria-selected={value === segment.value}
          onClick={() => onChange(segment.value)}
          className={cn('runs-segment', value === segment.value && 'runs-segment-active')}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}

export function RunsListClient({
  initialRuns,
  initialSelectedId,
  initialSinceDays = 7,
  initialQuickFilter = null,
}: RunsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quickFilter, setQuickFilter] = useState<QuickFilter>(initialQuickFilter ?? 'all');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [sinceDays, setSinceDays] = useState(String(initialSinceDays));

  useEffect(() => {
    setSinceDays(String(initialSinceDays));
  }, [initialSinceDays]);

  useEffect(() => {
    setQuickFilter(initialQuickFilter ?? 'all');
  }, [initialQuickFilter]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? searchParams.get('id') ?? initialRuns[0]?.id ?? null,
  );
  const [detail, setDetail] = useState<ScrapeRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const filteredRuns = useMemo(() => {
    return initialRuns.filter((run) => {
      if (quickFilter === 'failed' && run.status !== 'failed') {
        return false;
      }
      if (quickFilter === 'partial' && run.status !== 'partial') {
        return false;
      }
      if (selectedSource && run.source !== selectedSource) {
        return false;
      }
      if (selectedMode && run.crawlMode !== selectedMode) {
        return false;
      }
      if (selectedTrigger && run.triggerType !== selectedTrigger) {
        return false;
      }
      return true;
    });
  }, [initialRuns, quickFilter, selectedMode, selectedSource, selectedTrigger]);

  const handleSinceDaysChange = useCallback(
    (days: string) => {
      setSinceDays(days);
      const params = new URLSearchParams(searchParams.toString());
      if (days === '7') {
        params.delete('days');
      } else {
        params.set('days', days);
      }
      const query = params.toString();
      router.replace(query ? `/admin/runs?${query}` : '/admin/runs');
    },
    [router, searchParams],
  );

  const syncUrl = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set('id', id);
      } else {
        params.delete('id');
      }
      const query = params.toString();
      router.replace(query ? `/admin/runs?${query}` : '/admin/runs', { scroll: false });
    },
    [router, searchParams],
  );

  const selectRun = useCallback(
    (id: string) => {
      setSelectedId(id);
      syncUrl(id);
    },
    [syncUrl],
  );

  useEffect(() => {
    if (filteredRuns.length === 0) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

    if (!selectedId || !filteredRuns.some((run) => run.id === selectedId)) {
      selectRun(filteredRuns[0].id);
    }
  }, [filteredRuns, selectRun, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    fetch(`/api/admin/runs/${selectedId}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(runsMasterDetailMessages.detailLoadError);
        }
        const payload = (await response.json()) as { run: ScrapeRunDetail };
        if (!cancelled) {
          setDetail(payload.run);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(error instanceof Error ? error.message : runsMasterDetailMessages.detailLoadError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const isEmpty = filteredRuns.length === 0;

  return (
    <div className="runs-master-detail -mx-6 -mt-2 flex min-h-[calc(100vh-180px)] flex-col font-[system-ui,-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',sans-serif]">
      <header className="shrink-0 border-b border-black/[0.08] bg-[#f5f5f7]/80 px-6 py-4 backdrop-blur-sm">
        <div className="mb-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {runsMessages.pageTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#86868b]">{runsMessages.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl value={quickFilter} onChange={setQuickFilter} />
          <div className="flex flex-wrap items-center gap-2">
            <CompactSelect
              ariaLabel={runsMessages.filterAllSources}
              value={selectedSource}
              onChange={setSelectedSource}
              options={[
                { value: '', label: runsMessages.filterAllSources },
                ...SOURCE_SLUGS.map((slug) => ({
                  value: slug,
                  label: sourceDisplayNames[slug] ?? slug,
                })),
              ]}
            />
            <CompactSelect
              ariaLabel={runsMessages.filterAllModes}
              value={selectedMode}
              onChange={setSelectedMode}
              options={[
                { value: '', label: runsMessages.filterAllModes },
                { value: 'incremental', label: runsMessages.filterModeIncremental },
                { value: 'full', label: runsMessages.filterModeFull },
              ]}
            />
            <CompactSelect
              ariaLabel={runsMessages.filterAllTriggers}
              value={selectedTrigger}
              onChange={setSelectedTrigger}
              options={[
                { value: '', label: runsMessages.filterAllTriggers },
                { value: 'cron', label: runsMessages.filterTriggerCron },
                { value: 'manual', label: runsMessages.filterTriggerManual },
              ]}
            />
            <CompactSelect
              ariaLabel={runsMasterDetailMessages.timeFilterLabel}
              value={sinceDays}
              onChange={handleSinceDaysChange}
              options={[
                { value: '7', label: runsMasterDetailMessages.timeDays7 },
                { value: '14', label: runsMasterDetailMessages.timeDays14 },
                { value: '30', label: runsMasterDetailMessages.timeDays30 },
              ]}
            />
            <span className="runs-count-chip tabular-nums">
              {runsMessages.runCount(filteredRuns.length, Number(sinceDays) || 7)}
            </span>
          </div>
        </div>
        {sinceDays !== '7' ? (
          <p className="mt-2 text-[11px] text-[#86868b]">{runsMasterDetailMessages.timeFilterHint}</p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="runs-master-panel w-[400px] shrink-0 border-r border-black/[0.08] bg-[#f5f5f7]">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-[15px] font-medium text-[#1d1d1f]">{runsMessages.emptyHeading}</p>
              <p className="mt-2 text-[13px] text-[#86868b]">{runsMessages.emptyBody}</p>
              <Link href="/admin" className="runs-primary-btn mt-6">
                {runsMessages.emptyCta}
              </Link>
            </div>
          ) : (
            <ul className="runs-master-list flex h-full flex-col gap-2 overflow-y-auto p-3">
              {filteredRuns.map((run) => {
                const running = !run.finishedAt;
                const selected = run.id === selectedId;
                const statusLabel = resolveRunStatusLabel(run);

                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => selectRun(run.id)}
                      className={cn('runs-master-card w-full text-left', selected && 'runs-master-card-active')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[14px] font-semibold leading-tight text-[#1d1d1f]">
                          {sourceDisplayNames[run.source] ?? run.source}
                        </p>
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium leading-none',
                            statusBadgeClass(run.status, running),
                          )}
                        >
                          {running ? runsMessages.statusRunning : statusLabel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[#86868b]">
                        <time
                          className="truncate font-mono tabular-nums"
                          dateTime={run.startedAt}
                          title={formatRomeTooltip(run.startedAt)}
                        >
                          {formatUtcTimestamp(run.startedAt)}
                        </time>
                        <span className="shrink-0 font-mono tabular-nums">{durationLabel(run)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main className="runs-detail-shell min-w-0 flex-1 bg-white">
          {detailError ? (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <p className="text-[14px] text-[#ff3b30]">{detailError}</p>
            </div>
          ) : detail ? (
            <RunDetailPanel run={detail} loading={detailLoading} />
          ) : detailLoading ? (
            <RunDetailPanel
              run={{
                id: selectedId ?? '',
                startedAt: new Date().toISOString(),
                finishedAt: null,
                source: '',
                status: 'success',
                listingsFound: 0,
                listingsInserted: 0,
                listingsRejected: 0,
                selectorHitRate: null,
                failureReason: null,
                crawlMode: null,
                triggerType: null,
                wallTimeSeconds: null,
                listingsUpdated: 0,
                listingsSkipped: 0,
                listingsSkippedAtCrawl: 0,
                httpRequests: null,
                degraded: false,
                jsonFieldCompleteness: null,
                jobId: null,
                targetUrlsSnapshot: [],
                targetUrlCount: null,
                blockedUrlCount: 0,
                urlBreakdown: [],
              }}
              loading
            />
          ) : (
            <RunDetailEmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
