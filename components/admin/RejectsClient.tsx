'use client';

import { useEffect, useMemo, useState } from 'react';
import { RejectDetailEmptyState, RejectDetailPanel } from '@/components/admin/RejectDetailPanel';
import {
  rejectsMasterDetailMessages,
  rejectsMessages,
  SOURCE_SLUGS,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import { formatRomeTooltip, formatUtcTimestamp } from '@/lib/admin/format';
import {
  extractSnippetText,
  mapRejectReasonLabel,
  matchesReasonFilter,
  REASON_FILTERS,
} from '@/lib/admin/reject-reasons';
import type { ScrapeRejectItem } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RejectsClientProps = {
  initialRejects: ScrapeRejectItem[];
  initialRunId?: string;
};

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

function MasterListSkeleton() {
  return (
    <ul className="runs-master-list flex h-full flex-col gap-2 overflow-y-auto p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="runs-master-card animate-pulse">
          <div className="h-4 w-24 rounded bg-black/[0.06]" />
          <div className="mt-2 h-3 w-full rounded bg-black/[0.06]" />
          <div className="mt-2 h-3 w-3/4 rounded bg-black/[0.06]" />
        </li>
      ))}
    </ul>
  );
}

export function RejectsClient({ initialRejects, initialRunId }: RejectsClientProps) {
  const [rejects, setRejects] = useState(initialRejects);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading] = useState(false);

  const filteredRejects = useMemo(() => {
    return rejects.filter((item) => {
      if (initialRunId && item.scrapeRunId !== initialRunId) {
        return false;
      }
      if (selectedSource && item.source !== selectedSource) {
        return false;
      }
      if (!matchesReasonFilter(item.rejectReason, selectedReason)) {
        return false;
      }
      return true;
    });
  }, [rejects, initialRunId, selectedReason, selectedSource]);

  const selectedItem = useMemo(
    () => filteredRejects.find((item) => item.id === selectedId) ?? null,
    [filteredRejects, selectedId],
  );

  useEffect(() => {
    if (filteredRejects.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredRejects.some((item) => item.id === selectedId)) {
      setSelectedId(filteredRejects[0]?.id ?? null);
    }
  }, [filteredRejects, selectedId]);

  const isEmpty = filteredRejects.length === 0;

  async function handleRescrape(rejectId: string) {
    try {
      const response = await fetch(`/api/admin/rejects/${rejectId}/rescrape`, {
        method: 'POST',
      });
      const payload = (await response.json()) as {
        listingId?: string;
        offlineRescue?: boolean;
        error?: string;
      };

      if (!response.ok) {
        return {
          ok: false as const,
          error: typeof payload.error === 'string' ? payload.error : rejectsMessages.rescrapeFailed,
        };
      }

      if (!payload.listingId) {
        return { ok: false as const, error: rejectsMessages.rescrapeFailed };
      }

      setRejects((current) => current.filter((item) => item.id !== rejectId));
      return {
        ok: true as const,
        listingId: payload.listingId,
        offlineRescue: payload.offlineRescue === true,
      };
    } catch {
      return { ok: false as const, error: rejectsMessages.rescrapeFailed };
    }
  }

  return (
    <div className="rejects-master-detail runs-master-detail -mx-6 -mt-2 flex min-h-[calc(100vh-180px)] flex-col font-[system-ui,-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',sans-serif]">
      <header className="shrink-0 border-b border-black/[0.08] bg-[#f5f5f7]/80 px-6 py-4 backdrop-blur-sm">
        <div className="mb-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {rejectsMessages.pageTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#86868b]">{rejectsMessages.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CompactSelect
              ariaLabel={rejectsMessages.filterAllSources}
              value={selectedSource}
              onChange={setSelectedSource}
              options={[
                { value: '', label: rejectsMessages.filterAllSources },
                ...SOURCE_SLUGS.map((slug) => ({
                  value: slug,
                  label: sourceDisplayNames[slug] ?? slug,
                })),
              ]}
            />
            <CompactSelect
              ariaLabel={rejectsMessages.filterAllReasons}
              value={selectedReason}
              onChange={setSelectedReason}
              options={REASON_FILTERS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rejects-count-chip tabular-nums">
              {rejectsMasterDetailMessages.countChip(filteredRejects.length)}
            </span>
            <button
              type="button"
              disabled
              title="导出功能即将推出"
              className="runs-toolbar-btn gap-1.5 opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                download
              </span>
              {rejectsMessages.export}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="rejects-master-panel runs-master-panel shrink-0 border-r border-black/[0.08] bg-[#f5f5f7]">
          {isEmpty && !loading ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <span className="material-symbols-outlined mb-3 text-[40px] text-[#86868b]" aria-hidden>
                block
              </span>
              <p className="text-[15px] font-medium text-[#1d1d1f]">{rejectsMessages.emptyHeading}</p>
              <p className="mt-2 text-[13px] text-[#86868b]">{rejectsMessages.emptyBody}</p>
            </div>
          ) : loading ? (
            <MasterListSkeleton />
          ) : (
            <ul className="runs-master-list flex h-full flex-col gap-2 overflow-y-auto p-3">
              {filteredRejects.map((item) => {
                const selected = item.id === selectedId;
                const listingId = item.externalId ?? item.id.slice(0, 8);
                const snippet = extractSnippetText(item.rawSnippet);
                const sourceLabel = item.source ? sourceDisplayNames[item.source] ?? item.source : '—';

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'runs-master-card w-full text-left',
                        selected && 'rejects-master-card-active',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-[14px] font-semibold leading-tight',
                            selected ? 'text-blue-900' : 'text-[#1d1d1f]',
                          )}
                        >
                          {sourceLabel}
                        </p>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {mapRejectReasonLabel(item.rejectReason)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs tabular-nums text-[#1d1d1f]">
                          {listingId}
                        </span>
                        <time
                          className="rejects-card-muted shrink-0 font-mono text-[11px] tabular-nums text-gray-400"
                          dateTime={item.createdAt}
                          title={formatRomeTooltip(item.createdAt)}
                        >
                          {formatUtcTimestamp(item.createdAt)}
                        </time>
                      </div>
                      <p className="rejects-card-muted mt-1.5 truncate text-xs text-gray-500">
                        {snippet.preview}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main className="runs-detail-shell min-w-0 flex-1 bg-white">
          {selectedItem ? (
            <RejectDetailPanel item={selectedItem} onRescrape={handleRescrape} />
          ) : (
            <RejectDetailEmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
