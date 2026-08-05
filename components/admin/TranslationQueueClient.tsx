'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { translationMessages } from '@/components/admin/admin-messages';
import { sourceDisplayNames } from '@/components/admin/admin-messages';
import type { TranslationQueueItem } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type TranslationQueueClientProps = {
  initialItems: TranslationQueueItem[];
};

export function TranslationQueueClient({ initialItems }: TranslationQueueClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingCount = items.length;

  const showNotification = (message: string) => {
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current);
    }
    setNotification(message);
    notificationTimeout.current = setTimeout(() => setNotification(null), 3000);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
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

  const refreshFromResponse = (processedIds: string[]) => {
    if (processedIds.length === 0) {
      return;
    }
    setItems((prev) => prev.filter((item) => !processedIds.includes(item.listingId)));
    setSelectedIds((prev) => prev.filter((id) => !processedIds.includes(id)));
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

    return (await response.json()) as { processed: string[] };
  };

  const handleRetry = async (listingId: string) => {
    setErrorMessage(null);
    setLoadingId(listingId);
    try {
      const result = await postRetry({ listing_ids: [listingId] });
      refreshFromResponse(result.processed);
      if (result.processed.length > 0) {
        showNotification(translationMessages.translateSuccess(result.processed.length));
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translationMessages.retrying);
    } finally {
      setLoadingId(null);
    }
  };

  const handleBulkRetry = async () => {
    setErrorMessage(null);
    setIsBulkRetrying(true);
    try {
      const body =
        selectedIds.length > 0
          ? { listing_ids: selectedIds }
          : { all_pending: true as const };
      const result = await postRetry(body);
      refreshFromResponse(result.processed);
      if (result.processed.length > 0) {
        showNotification(translationMessages.translateSuccess(result.processed.length));
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translationMessages.retryAll);
    } finally {
      setIsBulkRetrying(false);
    }
  };

  const sourceLabel = useMemo(() => {
    return (slug: string) => sourceDisplayNames[slug] ?? slug;
  }, []);

  const isEmpty = items.length === 0;

  return (
    <div className="space-y-6">
      <header className="border-b border-outline-variant pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">
              {translationMessages.pageTitle}
            </h1>
            <p className="mt-1 text-[15px] text-secondary">{translationMessages.pageSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleBulkRetry}
            disabled={isEmpty || isBulkRetrying}
            className="inline-flex items-center gap-1.5 rounded border border-primary bg-primary px-3 py-1.5 text-[14px] font-medium text-on-primary hover:bg-surface-tint disabled:opacity-50"
          >
            <span
              className={cn(
                'material-symbols-outlined text-[18px]',
                isBulkRetrying && 'animate-spin',
              )}
              aria-hidden
            >
              refresh
            </span>
            {isBulkRetrying ? translationMessages.retrying : translationMessages.retryAllPending}
          </button>
        </div>
      </header>

      {!isEmpty && (
        <div className="flex items-center justify-between rounded border border-outline-variant bg-surface-container-low px-4 py-3 text-[14px]">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="inline-block h-2 w-2 rounded-full bg-error" aria-hidden />
            <span>{translationMessages.pendingBanner(pendingCount)}</span>
          </div>
          <span className="text-secondary">
            已选 {selectedIds.length}
          </span>
        </div>
      )}

      {errorMessage && (
        <p className="rounded border border-error/30 bg-error-container px-3 py-2 text-[14px] text-on-error-container">
          {errorMessage}
        </p>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded border border-outline-variant bg-surface px-6 py-16 text-center">
          <span className="material-symbols-outlined mb-3 text-[48px] text-outline" aria-hidden>
            check_circle
          </span>
          <h2 className="text-[24px] font-semibold text-on-surface">
            {translationMessages.emptyHeading}
          </h2>
          <p className="mt-2 max-w-md text-[15px] text-secondary">
            {translationMessages.emptyBody}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-outline-variant bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead className="border-b border-outline-variant bg-surface-container-low text-[12px] uppercase tracking-wide text-secondary">
                <tr>
                  <th className="w-10 p-4 text-center">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.length === items.length}
                      onChange={toggleSelectAll}
                      className="accent-primary"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="p-4 font-medium">{translationMessages.tableListing}</th>
                  <th className="p-4 font-medium">{translationMessages.tableStatus}</th>
                  <th className="p-4 font-medium">{translationMessages.tableAttempts}</th>
                  <th className="p-4 font-medium">{translationMessages.tableError}</th>
                  <th className="p-4 text-right font-medium">{translationMessages.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {items.map((item) => {
                  const isLoading = loadingId === item.listingId;
                  const isSelected = selectedIds.includes(item.listingId);
                  return (
                    <tr
                      key={item.listingId}
                      className={cn(
                        'hover:bg-surface-container-lowest',
                        isSelected && 'bg-surface-container-low',
                      )}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.listingId)}
                          className="accent-primary"
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-on-surface">{item.title}</p>
                        <p className="mt-0.5 font-mono text-[12px] text-secondary">
                          {item.externalId ?? item.listingId.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-secondary">
                          {sourceLabel(item.source)}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'inline-flex rounded px-2 py-0.5 text-[12px] font-medium',
                            item.status === 'failed'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container-high text-on-surface',
                          )}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-secondary">{item.attempts}</td>
                      <td className="p-4 max-w-xs">
                        {item.lastError ? (
                          <div className="flex items-start gap-1 text-error">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden>
                              warning
                            </span>
                            <span className="line-clamp-2 text-[13px]">{item.lastError}</span>
                          </div>
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRetry(item.listingId)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 rounded border border-outline-variant px-2 py-1 text-[12px] hover:bg-surface-container-low disabled:opacity-50"
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {notification && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high px-4 py-3 text-[14px] font-medium text-on-surface shadow-lg"
        >
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden>
            check_circle
          </span>
          {notification}
        </div>
      )}
    </div>
  );
}
