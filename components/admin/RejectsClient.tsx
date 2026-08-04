'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  rejectsMessages,
  SOURCE_SLUGS,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import {
  formatRomeTooltip,
  formatUtcTimestamp,
  snippetPreview,
} from '@/lib/admin/format';
import { mapRejectReasonLabel, matchesReasonFilter, REASON_FILTERS } from '@/lib/admin/reject-reasons';
import type { ScrapeRejectItem } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RejectsClientProps = {
  initialRejects: ScrapeRejectItem[];
  initialRunId?: string;
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {Array.from({ length: 6 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-surface-container-high" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function RejectsClient({ initialRejects, initialRunId }: RejectsClientProps) {
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading] = useState(false);

  const filteredRejects = useMemo(() => {
    return initialRejects.filter((item) => {
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
  }, [initialRejects, initialRunId, selectedReason, selectedSource]);

  const isEmpty = filteredRejects.length === 0;

  return (
    <div className="space-y-6">
      <header className="border-b border-outline-variant pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">
              {rejectsMessages.pageTitle}
            </h1>
            <p className="mt-1 text-[15px] text-secondary">{rejectsMessages.pageSubtitle}</p>
          </div>
          <button
            type="button"
            disabled
            title="导出功能即将推出"
            className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 py-1.5 text-[14px] text-secondary opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              download
            </span>
            {rejectsMessages.export}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedSource}
            onChange={(event) => setSelectedSource(event.target.value)}
            className="rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
          >
            <option value="">{rejectsMessages.filterAllSources}</option>
            {SOURCE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {sourceDisplayNames[slug] ?? slug}
              </option>
            ))}
          </select>
          <select
            value={selectedReason}
            onChange={(event) => setSelectedReason(event.target.value)}
            className="rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
          >
            {REASON_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-[14px] text-secondary">
          {rejectsMessages.showingCount(filteredRejects.length)}
        </span>
      </div>

      {isEmpty && !loading ? (
        <div className="flex flex-col items-center justify-center rounded border border-outline-variant bg-surface px-6 py-16 text-center">
          <span className="material-symbols-outlined mb-4 text-[48px] text-secondary" aria-hidden>
            block
          </span>
          <h2 className="text-[20px] font-semibold text-on-surface">{rejectsMessages.emptyHeading}</h2>
          <p className="mt-2 max-w-md text-[15px] text-secondary">{rejectsMessages.emptyBody}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-outline-variant bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-[15px]">
              <thead className="border-b border-outline-variant bg-surface-container-low text-[14px] font-medium text-secondary">
                <tr>
                  <th className="px-4 py-3">{rejectsMessages.tableFoundAt}</th>
                  <th className="px-4 py-3">{rejectsMessages.tableSource}</th>
                  <th className="px-4 py-3">{rejectsMessages.tableListingId}</th>
                  <th className="px-4 py-3">{rejectsMessages.tableReason}</th>
                  <th className="px-4 py-3">{rejectsMessages.tablePreview}</th>
                  <th className="px-4 py-3 text-right">{rejectsMessages.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <SkeletonRows />
                ) : (
                  filteredRejects.map((item) => {
                    const expanded = expandedId === item.id;
                    return (
                      <Fragment key={item.id}>
                        <tr className="group hover:bg-surface-container-low/50">
                          <td
                            className="px-4 py-3 font-mono text-[13px] text-secondary"
                            title={formatRomeTooltip(item.createdAt)}
                          >
                            {formatUtcTimestamp(item.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {item.source ? sourceDisplayNames[item.source] ?? item.source : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-[13px]">
                            {item.externalId ?? item.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[13px]">
                              {mapRejectReasonLabel(item.rejectReason)}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-[14px] text-secondary">
                            {snippetPreview(item.rawSnippet)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : item.id)}
                              className={cn(
                                'text-[14px] underline hover:text-secondary',
                                expanded ? 'text-on-surface' : 'text-primary opacity-0 group-hover:opacity-100',
                              )}
                            >
                              {expanded ? rejectsMessages.hideJson : rejectsMessages.viewJson}
                            </button>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr>
                            <td colSpan={6} className="bg-surface-container-low px-4 py-3">
                              <pre className="max-h-48 overflow-y-auto overflow-x-auto rounded border border-outline-variant bg-[#202020] p-3 font-mono text-[12px] leading-relaxed text-[#70c38a]">
                                {JSON.stringify(item.rawSnippet, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
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
