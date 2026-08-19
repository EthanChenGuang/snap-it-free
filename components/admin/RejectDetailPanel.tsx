'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  rejectsMessages,
  sourceDisplayNames,
} from '@/components/admin/admin-messages';
import { formatRomeTooltip, formatUtcTimestamp } from '@/lib/admin/format';
import { extractRuleDetail, extractSnippetText, mapRejectReasonLabel } from '@/lib/admin/reject-reasons';
import type { ScrapeRejectItem } from '@/lib/admin/types';

type RejectDetailPanelProps = {
  item: ScrapeRejectItem;
  onRescrape?: (
    rejectId: string,
  ) => Promise<
    | { ok: true; listingId: string; offlineRescue?: boolean }
    | { ok: false; error: string }
  >;
};

function RejectDetailEmptyState() {
  return (
    <div className="runs-detail-panel flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-[#86868b]">
        <span className="material-symbols-outlined text-[24px]" aria-hidden>
          block
        </span>
      </div>
      <p className="text-[15px] font-medium text-[#1d1d1f]">{rejectsMessages.selectRejectTitle}</p>
      <p className="mt-1 max-w-sm text-[13px] text-[#86868b]">{rejectsMessages.selectRejectBody}</p>
    </div>
  );
}

export function RejectDetailPanel({ item, onRescrape }: RejectDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [rescrapeState, setRescrapeState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [rescrapeMessage, setRescrapeMessage] = useState<string | null>(null);
  const [rescuedListingId, setRescuedListingId] = useState<string | null>(null);
  const listingId = item.externalId ?? item.id.slice(0, 8);
  const sourceLabel = item.source ? sourceDisplayNames[item.source] ?? item.source : '—';
  const rule = extractRuleDetail(item.rejectReason);
  const snippet = extractSnippetText(item.rawSnippet);
  const hasStructuredText = Boolean(snippet.title || snippet.description);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(listingId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [listingId]);

  const handleRescrape = useCallback(async () => {
    if (!onRescrape || rescrapeState === 'loading') {
      return;
    }
    setRescrapeState('loading');
    setRescrapeMessage(null);
    const result = await onRescrape(item.id);
    if (result.ok) {
      setRescrapeState('success');
      setRescrapeMessage(
        result.offlineRescue ? rejectsMessages.rescrapeSuccessOffline : rejectsMessages.rescrapeSuccess,
      );
      setRescuedListingId(result.listingId);
      return;
    }
    setRescrapeState('error');
    setRescrapeMessage(result.error || rejectsMessages.rescrapeFailed);
  }, [item.id, onRescrape, rescrapeState]);

  return (
    <div className="runs-detail-panel flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-black/[0.08] px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-[15px] font-semibold tabular-nums tracking-tight text-[#1d1d1f]">
                {listingId}
              </h2>
              <span className="inline-flex shrink-0 items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {mapRejectReasonLabel(item.rejectReason)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#86868b]">
              <span>
                {rejectsMessages.detailSource}:{' '}
                <span className="font-medium text-[#1d1d1f]">{sourceLabel}</span>
              </span>
              <time
                className="font-mono tabular-nums"
                dateTime={item.createdAt}
                title={formatRomeTooltip(item.createdAt)}
              >
                {formatUtcTimestamp(item.createdAt)}
              </time>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onRescrape && item.source === 'subito' ? (
              <button
                type="button"
                disabled={rescrapeState === 'loading' || rescrapeState === 'success'}
                onClick={() => void handleRescrape()}
                className="runs-primary-btn gap-1.5 disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${rescrapeState === 'loading' ? 'animate-spin' : ''}`}
                  aria-hidden
                >
                  {rescrapeState === 'loading' ? 'progress_activity' : 'refresh'}
                </span>
                {rescrapeState === 'loading'
                  ? rejectsMessages.rescraping
                  : rejectsMessages.rescrapeOne}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="runs-toolbar-btn gap-1.5"
              aria-label={rejectsMessages.copyListingId}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? rejectsMessages.copiedListingId : rejectsMessages.copyListingId}
            </button>
          </div>
        </div>
        {rescrapeMessage ? (
          <p
            className={`mt-3 text-[13px] ${rescrapeState === 'error' ? 'text-[#ff3b30]' : 'text-[#248a3d]'}`}
            role="status"
          >
            {rescrapeMessage}
            {rescuedListingId ? (
              <>
                {' '}
                <Link href={`/listing/${rescuedListingId}`} className="font-medium text-[#007aff] hover:underline">
                  {rejectsMessages.viewListing}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <section className="rejects-rule-card">
          <h3 className="text-[13px] font-semibold text-amber-900">{rejectsMessages.ruleAnalysisTitle}</h3>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">
                {rejectsMessages.ruleStrategyLabel}
              </dt>
              <dd className="mt-0.5 font-medium text-amber-950">{rule.strategy}</dd>
            </div>
            {rule.matchedPattern ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">
                  {rejectsMessages.rulePatternLabel}
                </dt>
                <dd className="mt-0.5">
                  <code className="rounded-md bg-amber-100/80 px-2 py-1 font-mono text-[12px] text-amber-950">
                    {rule.matchedPattern}
                  </code>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">
                {rejectsMessages.ruleRawReasonLabel}
              </dt>
              <dd className="mt-0.5 font-mono text-[12px] leading-relaxed text-amber-950/90">
                {rule.rawReason}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rejects-snapshot-card">
          <h3 className="text-[13px] font-semibold text-[#1d1d1f]">{rejectsMessages.snapshotTitle}</h3>
          {hasStructuredText ? (
            <div className="mt-3 space-y-3">
              {snippet.title ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
                    {rejectsMessages.snapshotTitleLabel}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#1d1d1f]">{snippet.title}</p>
                </div>
              ) : null}
              {snippet.description ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
                    {rejectsMessages.snapshotDescriptionLabel}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[#636366]">
                    {snippet.description}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-[#1e1e1e] p-3 font-mono text-[12px] leading-relaxed text-[#70c38a]">
              {JSON.stringify(item.rawSnippet, null, 2)}
            </pre>
          )}
        </section>

        {item.scrapeRunId ? (
          <div className="pt-1">
            <Link
              href={`/admin/runs/${item.scrapeRunId}`}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-[#007aff] hover:underline"
            >
              {rejectsMessages.linkedRun}
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                arrow_forward
              </span>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { RejectDetailEmptyState };
