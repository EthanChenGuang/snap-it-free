'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedCount } from '@/components/admin/AnimatedCount';
import {
  sourceDisplayNames,
  translationMessages,
} from '@/components/admin/admin-messages';
import { AutoTranslateSettingsPanel } from '@/components/admin/AutoTranslateSettingsPanel';
import { TranslationCostKpiGrid } from '@/components/admin/TranslationCostKpiGrid';
import { TranslationListingCostPill } from '@/components/admin/TranslationListingCostPill';
import { useTranslationQueuePollingContext } from '@/components/admin/TranslationQueuePollingProvider';
import {
  translationQueuePageHref,
  translationQueuePageRange,
  translationQueueTotalPages,
} from '@/lib/admin/translation-queue-pagination';
import type { TranslationCostSummary, TranslationQueueItem } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type TranslationQueueClientProps = {
  initialItems: TranslationQueueItem[];
  totalPending: number;
  initialCostSummary: TranslationCostSummary;
  page: number;
  pageSize: number;
};

function TranslationQueueCard({
  item,
  sourceLabel,
  selected,
  isLoading,
  onToggleSelect,
  onRetry,
}: {
  item: TranslationQueueItem;
  sourceLabel: string;
  selected: boolean;
  isLoading: boolean;
  onToggleSelect: () => void;
  onRetry: () => void;
}) {
  const displayId = item.externalId ?? item.listingId.slice(0, 8);
  const isFailed = item.status === 'failed';

  return (
    <article
      className={cn(
        'translation-queue-card',
        selected && 'translation-queue-card-selected',
      )}
    >
      <div className="translation-queue-card-left">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="translation-queue-checkbox"
          aria-label={`选择 ${item.title}`}
        />
        <div className="translation-queue-card-meta">
          <p className="translation-queue-card-title" title={item.title}>
            {item.title}
          </p>
          <div className="translation-queue-card-subinfo">
            <span className="translation-queue-id tabular-nums">{displayId}</span>
            <TranslationListingCostPill cost={item.cost} listingId={item.listingId} />
            <span className="translation-queue-source-badge">{sourceLabel}</span>
          </div>
        </div>
      </div>

      <div className="translation-queue-card-middle">
        <div className="translation-queue-status-row">
          <span
            className={cn(
              'translation-queue-status-badge',
              isFailed && 'translation-queue-status-badge-failed',
            )}
          >
            {item.statusLabel}
          </span>
          <span className="translation-queue-attempts tabular-nums">
            {translationMessages.attemptsLabel(item.attempts)}
          </span>
          {item.lastError ? (
            <span
              className="translation-queue-error-badge"
              tabIndex={0}
              aria-describedby={`error-tip-${item.listingId}`}
            >
              <span className="material-symbols-outlined translation-queue-error-badge-icon" aria-hidden>
                warning
              </span>
              <span>{translationMessages.errorBadgeLabel(item.lastError)}</span>
              <span
                id={`error-tip-${item.listingId}`}
                role="tooltip"
                className="translation-queue-error-tooltip"
              >
                {item.lastError}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="translation-queue-card-actions">
        <button
          type="button"
          onClick={onRetry}
          disabled={isLoading}
          className="translation-queue-retry-btn"
        >
          <span
            className={cn(
              'material-symbols-outlined text-[16px]',
              isLoading && 'animate-spin',
            )}
            aria-hidden
          >
            replay
          </span>
          {isLoading ? translationMessages.retrying : translationMessages.retry}
        </button>
      </div>
    </article>
  );
}

type ProcessedTranslation = {
  listingId: string;
  provider: 'gemini' | 'openrouter';
  durationMs: number;
};

type RetryResponse = {
  processed: ProcessedTranslation[];
  failures?: Array<{ listingId: string; error: string }>;
};

function TranslationQueuePagination({
  page,
  pageSize,
  totalPending,
}: {
  page: number;
  pageSize: number;
  totalPending: number;
}) {
  const totalPages = translationQueueTotalPages(totalPending, pageSize);
  if (totalPages <= 1) {
    return null;
  }

  const { from, to } = translationQueuePageRange(page, totalPending, pageSize);
  const prevHref = page > 1 ? translationQueuePageHref(page - 1) : null;
  const nextHref = page < totalPages ? translationQueuePageHref(page + 1) : null;

  return (
    <nav className="translation-queue-pagination" aria-label="翻译队列分页">
      <p className="translation-queue-pagination-range">
        {translationMessages.pageRange(from, to, totalPending)}
      </p>
      <div className="translation-queue-pagination-controls">
        {prevHref ? (
          <Link href={prevHref} className="translation-queue-pagination-btn">
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              chevron_left
            </span>
            {translationMessages.pagePrev}
          </Link>
        ) : (
          <span className="translation-queue-pagination-btn translation-queue-pagination-btn-disabled">
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              chevron_left
            </span>
            {translationMessages.pagePrev}
          </span>
        )}
        <span className="translation-queue-pagination-summary">
          {translationMessages.pageSummary(page, totalPages)}
        </span>
        {nextHref ? (
          <Link href={nextHref} className="translation-queue-pagination-btn">
            {translationMessages.pageNext}
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              chevron_right
            </span>
          </Link>
        ) : (
          <span className="translation-queue-pagination-btn translation-queue-pagination-btn-disabled">
            {translationMessages.pageNext}
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              chevron_right
            </span>
          </span>
        )}
      </div>
    </nav>
  );
}

export function TranslationQueueClient({
  initialItems,
  totalPending,
  initialCostSummary,
  page,
  pageSize,
}: TranslationQueueClientProps) {
  const router = useRouter();
  const {
    pendingCount,
    setPendingCount,
    isPolling,
    isBulkTranslating,
    retryAllPending,
    fetchPendingCount,
  } = useTranslationQueuePollingContext();
  const [items, setItems] = useState(initialItems);
  const [costSummary, setCostSummary] = useState(initialCostSummary);
  const [costLoading, setCostLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isBatchRetrying, setIsBatchRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSelection = selectedIds.length > 0;
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const refreshCostSummary = useCallback(async () => {
    setCostLoading(true);
    try {
      const response = await fetch('/api/admin/translation/cost');
      const payload = (await response.json()) as {
        summary?: TranslationCostSummary;
      };
      if (response.ok && payload.summary) {
        setCostSummary(payload.summary);
      }
    } catch {
      // keep existing summary on refresh failure
    } finally {
      setCostLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems(initialItems);
    setSelectedIds([]);
    if (!isPolling && !isBulkTranslating) {
      setPendingCount(totalPending);
    }
  }, [initialItems, totalPending, page, isPolling, isBulkTranslating, setPendingCount]);

  const showNotification = useCallback((message: string) => {
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current);
    }
    setNotification(message);
    notificationTimeout.current = setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleRetryAllPending = async () => {
    setErrorMessage(null);

    try {
      const result = await retryAllPending();

      if (result === 'skipped') {
        return;
      }

      if (result === 'completed') {
        showNotification(translationMessages.retryAllPendingComplete);
      } else if (result === 'partial') {
        showNotification(translationMessages.retryAllPendingComplete);
      } else if (result === 'error') {
        setErrorMessage(translationMessages.retryAll);
      }

      void router.refresh();
      void refreshCostSummary();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translationMessages.retryAll);
    }
  };

  const showProcessedSuccess = (processed: ProcessedTranslation[]) => {
    if (processed.length === 0) {
      return;
    }
    showNotification(translationMessages.translateSuccessBatch(processed));
  };

  const showBatchResult = (
    processed: ProcessedTranslation[],
    failures?: Array<{ listingId: string; error: string }>,
  ) => {
    const failureCount = failures?.length ?? 0;
    const successCount = processed.length;

    if (successCount > 0 && failureCount === 0) {
      showProcessedSuccess(processed);
      return;
    }
    if (successCount === 0 && failureCount > 0) {
      showNotification(translationMessages.translateFailureBatch(failureCount));
      return;
    }
    if (successCount > 0 && failureCount > 0) {
      showNotification(translationMessages.translatePartialBatch(successCount, failureCount));
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.listingId));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const refreshFromResponse = (processed: ProcessedTranslation[]) => {
    if (processed.length === 0) {
      return;
    }
    const processedIds = processed.map((item) => item.listingId);
    setItems((prev) => prev.filter((item) => !processedIds.includes(item.listingId)));
    setSelectedIds((prev) => prev.filter((id) => !processedIds.includes(id)));
    setPendingCount((prev) => Math.max(0, prev - processedIds.length));
    void refreshCostSummary();
  };

  const postRetry = async (body: { listing_ids?: string[]; all_pending?: boolean }) => {
    const response = await fetch('/api/admin/translation/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Retry failed');
    }

    return (await response.json()) as RetryResponse;
  };

  const applyFailures = (failures?: Array<{ listingId: string; error: string }>) => {
    if (!failures?.length) {
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        const failure = failures.find((entry) => entry.listingId === item.listingId);
        if (!failure) {
          return item;
        }
        return {
          ...item,
          status: 'failed' as const,
          statusLabel: translationMessages.statusFailed,
          attempts: item.attempts + 1,
          lastError: failure.error,
        };
      }),
    );
  };

  const handleRetry = async (listingId: string) => {
    setErrorMessage(null);
    setLoadingId(listingId);
    try {
      const result = await postRetry({ listing_ids: [listingId] });
      refreshFromResponse(result.processed);
      applyFailures(result.failures);
      showBatchResult(result.processed, result.failures);
      if (result.processed.length > 0) {
        void router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translationMessages.retrying);
    } finally {
      setLoadingId(null);
    }
  };

  const handleBatchRetry = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setErrorMessage(null);
    setIsBatchRetrying(true);
    try {
      const result = await postRetry({ listing_ids: selectedIds });
      refreshFromResponse(result.processed);
      applyFailures(result.failures);
      showBatchResult(result.processed, result.failures);
      void router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translationMessages.retryAll);
    } finally {
      setIsBatchRetrying(false);
    }
  };

  const sourceLabel = useMemo(() => {
    return (slug: string) => sourceDisplayNames[slug] ?? slug;
  }, []);

  const isEmpty = items.length === 0;

  return (
    <div className="translation-queue-page mx-auto max-w-5xl space-y-6 pb-8">
      <header className="translation-queue-header">
        <div className="translation-queue-header-copy">
          <h1 className="translation-queue-title">{translationMessages.pageTitle}</h1>
          <p className="translation-queue-subtitle">{translationMessages.pageSubtitle}</p>
          {!isEmpty ? (
            <p className="translation-queue-pending-hint">
              <AnimatedCount value={pendingCount} /> {translationMessages.pendingBannerSuffix}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleRetryAllPending}
          disabled={isEmpty || isBulkTranslating}
          className="translation-queue-primary-btn"
        >
          <span
            className={cn(
              'material-symbols-outlined text-[18px]',
              isBulkTranslating && 'animate-spin',
            )}
            aria-hidden
          >
            {isBulkTranslating ? 'progress_activity' : 'refresh'}
          </span>
          {isBulkTranslating
            ? translationMessages.retryAllPendingProcessing
            : translationMessages.retryAllPending}
        </button>
      </header>

      <AutoTranslateSettingsPanel />

      <TranslationCostKpiGrid summary={costSummary} loading={costLoading} />

      {errorMessage ? (
        <p className="translation-queue-alert translation-queue-alert-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isEmpty ? (
        <div className="translation-queue-empty">
          <span className="material-symbols-outlined translation-queue-empty-icon" aria-hidden>
            check_circle
          </span>
          <h2 className="translation-queue-empty-title">{translationMessages.emptyHeading}</h2>
          <p className="translation-queue-empty-body">{translationMessages.emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="translation-queue-batch-bar">
            <label className="translation-queue-batch-select">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="translation-queue-checkbox"
              />
              <span className="translation-queue-batch-label">
                已选 <AnimatedCount value={selectedIds.length} /> 项 / 共{' '}
                <AnimatedCount value={pendingCount} /> 条待翻译
              </span>
            </label>
            <div className="translation-queue-batch-actions">
              <button
                type="button"
                onClick={handleBatchRetry}
                disabled={!hasSelection || isBatchRetrying}
                className="translation-queue-accent-btn"
              >
                {isBatchRetrying
                  ? translationMessages.batchRetrying(selectedIds.length)
                  : translationMessages.batchRetry}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={!hasSelection}
                className="translation-queue-ghost-btn"
              >
                {translationMessages.clearSelection}
              </button>
            </div>
          </div>

          <div className="translation-queue-list">
            {items.map((item) => (
              <TranslationQueueCard
                key={item.listingId}
                item={item}
                sourceLabel={sourceLabel(item.source)}
                selected={selectedIdSet.has(item.listingId)}
                isLoading={loadingId === item.listingId}
                onToggleSelect={() => toggleSelect(item.listingId)}
                onRetry={() => handleRetry(item.listingId)}
              />
            ))}
          </div>

          <TranslationQueuePagination
            page={page}
            pageSize={pageSize}
            totalPending={pendingCount}
          />
        </>
      )}

      {notification ? (
        <div role="status" className="translation-queue-toast">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            check_circle
          </span>
          {notification}
        </div>
      ) : null}
    </div>
  );
}

export function TranslationQueueSkeleton() {
  return (
    <div
      className="translation-queue-page mx-auto max-w-5xl space-y-6 pb-8"
      aria-busy
      aria-label={translationMessages.pageTitle}
    >
      <header className="translation-queue-header">
        <div className="translation-queue-header-copy space-y-2">
          <div className="admin-skeleton h-8 w-40" />
          <div className="admin-skeleton h-4 w-72" />
          <div className="admin-skeleton h-3 w-56" />
        </div>
        <div className="admin-skeleton h-10 w-44 rounded-lg" />
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="admin-skeleton h-[104px] rounded-xl" />
        ))}
      </section>

      <div className="admin-skeleton h-[60px] rounded-xl" />

      <div className="translation-queue-list" aria-hidden>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="admin-skeleton h-[74px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
