'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2000;

export type TranslationQueuePollingCallbacks = {
  onZero?: () => void;
  onError?: () => void;
};

export type TranslationQueuePollingValue = {
  pendingCount: number;
  setPendingCount: React.Dispatch<React.SetStateAction<number>>;
  isPolling: boolean;
  startPolling: (callbacks?: TranslationQueuePollingCallbacks) => void;
  stopPolling: () => void;
  fetchPendingCount: () => Promise<number | null>;
};

export function useTranslationQueuePolling(
  initialCount: number,
): TranslationQueuePollingValue {
  const [pendingCount, setPendingCount] = useState(initialCount);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacksRef = useRef<TranslationQueuePollingCallbacks>({});

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

  useEffect(() => {
    if (!isPolling) {
      setPendingCount(initialCount);
    }
  }, [initialCount, isPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    pendingCount,
    setPendingCount,
    isPolling,
    startPolling,
    stopPolling,
    fetchPendingCount,
  };
}
