'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  sourceDisplayNames,
  translationMessages,
} from '@/components/admin/admin-messages';
import { TranslationCostKpiGrid } from '@/components/admin/TranslationCostKpiGrid';
import { TranslationListingCostPill } from '@/components/admin/TranslationListingCostPill';
import type { TranslationCostSummary, TranslationQueueItem } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type TranslationQueueClientProps = {
  initialItems: TranslationQueueItem[];
  totalPending: number;
  initialCostSummary: TranslationCostSummary;
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

export function TranslationQueueClient({
  initialItems,
  totalPending,
  initialCostSummary,
}: TranslationQueueClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pendingCount, setPendingCount] = useState(totalPending);
  const [costSummary, setCostSummary] = useState(initialCostSummary);
  const [costLoading, setCostLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRetryAllPending, setIsRetryAllPending] = useState(false);
  const [isBatchRetrying, setIsBatchRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTruncated = items.length < pendingCount;
  const hasSelection = selectedIds.length > 0;
  const allSelected = items.length > 0 && selectedIds.length === items.length;

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
    void refreshCostSummary();
  }, [refreshCostSummary]);

  const showNotification = (message: string) => {
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current);
    }
    setNotification(message);
    notificationTimeout.current = setTimeout(() => setNotification(null), 5000);
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

  const handleRetryAllPending = async () => {
    setErrorMessage(null);
    setIsRetryAllPending(true);
    try {
      const result = await postRetry({ all_pending: true });
      refreshFromResponse(result.processed);
      applyFailures(result.failures);
      showBatchResult(result.processed, result.failures);
      void router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translationMessages.retryAll);
    } finally {
      setIsRetryAllPending(false);
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
              {isTruncated
                ? translationMessages.pendingBannerTruncated(items.length, pendingCount)
                : translationMessages.pendingBanner(pendingCount)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleRetryAllPending}
          disabled={isEmpty || isRetryAllPending}
          className="translation-queue-primary-btn"
        >
          <span
            className={cn(
              'material-symbols-outlined text-[18px]',
              isRetryAllPending && 'animate-spin',
            )}
            aria-hidden
          >
            refresh
          </span>
          {isRetryAllPending ? translationMessages.retrying : translationMessages.retryAllPending}
        </button>
      </header>

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
              <span className="translation-queue-batch-label tabular-nums">
                {translationMessages.batchSelection(selectedIds.length, pendingCount)}
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
                selected={selectedIds.includes(item.listingId)}
                isLoading={loadingId === item.listingId}
                onToggleSelect={() => toggleSelect(item.listingId)}
                onRetry={() => handleRetry(item.listingId)}
              />
            ))}
          </div>
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
