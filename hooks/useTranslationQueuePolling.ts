'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RetryAllPendingResult } from '@/lib/admin/auto-translate-settings';

const POLL_INTERVAL_MS = 2000;

export type TranslationQueuePollingCallbacks = {
  onZero?: () => void;
  onError?: () => void;
};

export type TranslationQueuePollingValue = {
  pendingCount: number;
  setPendingCount: React.Dispatch<React.SetStateAction<number>>;
  isPolling: boolean;
  isBulkTranslating: boolean;
  startPolling: (callbacks?: TranslationQueuePollingCallbacks) => void;
  stopPolling: () => void;
  fetchPendingCount: () => Promise<number | null>;
  retryAllPending: () => Promise<RetryAllPendingResult>;
};

export function useTranslationQueuePolling(
  initialCount: number,
): TranslationQueuePollingValue {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(initialCount);
  const [isPolling, setIsPolling] = useState(false);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacksRef = useRef<TranslationQueuePollingCallbacks>({});
  const inFlightRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchPendingCount = useCallback(async (): Promise<number | null> => {
    try {
      const response = await fetch('/api/admin/translation/pending-count');
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as { pendingCount?: number };
      return typeof payload.pendingCount === 'number' ? payload.pendingCount : null;
    } catch {
      return null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    const count = await fetchPendingCount();
    if (count === null) {
      stopPolling();
      callbacksRef.current.onError?.();
      return;
    }

    setPendingCount(count);

    if (count === 0) {
      stopPolling();
      callbacksRef.current.onZero?.();
    }
  }, [fetchPendingCount, stopPolling]);

  const startPolling = useCallback(
    (callbacks?: TranslationQueuePollingCallbacks) => {
      stopPolling();
      callbacksRef.current = callbacks ?? {};
      setIsPolling(true);
      void pollOnce();
      intervalRef.current = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    },
    [pollOnce, stopPolling],
  );

  const retryAllPending = useCallback(async (): Promise<RetryAllPendingResult> => {
    if (inFlightRef.current) {
      return 'skipped';
    }

    const pendingBefore = await fetchPendingCount();
    if (pendingBefore === 0) {
      return 'empty';
    }

    inFlightRef.current = true;
    setIsBulkTranslating(true);

    let completedViaPolling = false;

    const finish = () => {
      inFlightRef.current = false;
      setIsBulkTranslating(false);
      stopPolling();
    };

    startPolling({
      onZero: () => {
        completedViaPolling = true;
        finish();
        void router.refresh();
      },
      onError: () => {
        if (!completedViaPolling) {
          finish();
        }
      },
    });

    try {
      const response = await fetch('/api/admin/translation/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_pending: true }),
      });

      if (!response.ok) {
        throw new Error('Retry failed');
      }

      const latestCount = await fetchPendingCount();
      if (latestCount !== null) {
        setPendingCount(latestCount);
      }

      if (completedViaPolling) {
        return 'completed';
      }

      finish();

      if (latestCount === 0) {
        void router.refresh();
        return 'completed';
      }

      void router.refresh();
      return 'partial';
    } catch {
      finish();
      return 'error';
    }
  }, [fetchPendingCount, router, startPolling, stopPolling]);

  useEffect(() => {
    if (!isPolling && !isBulkTranslating) {
      setPendingCount(initialCount);
    }
  }, [initialCount, isBulkTranslating, isPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    pendingCount,
    setPendingCount,
    isPolling,
    isBulkTranslating,
    startPolling,
    stopPolling,
    fetchPendingCount,
    retryAllPending,
  };
}
