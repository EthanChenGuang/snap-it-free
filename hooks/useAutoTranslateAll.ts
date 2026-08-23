'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampAutoTranslateInterval,
  loadAutoTranslateSettings,
  saveAutoTranslateSettings,
  type AutoTranslateSettings,
  type AutoTranslateTickResult,
} from '@/lib/admin/auto-translate-settings';
import { useRetryAllPendingTranslations } from '@/hooks/useRetryAllPendingTranslations';

export function useAutoTranslateAll() {
  const { retryAllPending, isBulkTranslating } = useRetryAllPendingTranslations();
  const [settings, setSettingsState] = useState<AutoTranslateSettings>(() => loadAutoTranslateSettings());
  const [lastCheckAt, setLastCheckAt] = useState<Date | null>(null);
  const [lastTickResult, setLastTickResult] = useState<AutoTranslateTickResult | null>(null);
  const tickRef = useRef<(() => Promise<void>) | null>(null);
  const isBulkTranslatingRef = useRef(isBulkTranslating);

  useEffect(() => {
    isBulkTranslatingRef.current = isBulkTranslating;
  }, [isBulkTranslating]);

  const persistSettings = useCallback((next: AutoTranslateSettings) => {
    const normalized = {
      enabled: next.enabled,
      intervalMinutes: clampAutoTranslateInterval(next.intervalMinutes),
    };
    setSettingsState(normalized);
    saveAutoTranslateSettings(normalized);
  }, []);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      persistSettings({ ...settings, enabled });
    },
    [persistSettings, settings],
  );

  const setIntervalMinutes = useCallback(
    (intervalMinutes: number) => {
      persistSettings({ ...settings, intervalMinutes });
    },
    [persistSettings, settings],
  );

  const runScheduledCheck = useCallback(async () => {
    setLastCheckAt(new Date());

    if (isBulkTranslatingRef.current) {
      setLastTickResult('skipped-busy');
      return;
    }

    const result = await retryAllPending();
    setLastTickResult(result === 'skipped' ? 'skipped-busy' : result);
  }, [retryAllPending]);

  useEffect(() => {
    tickRef.current = runScheduledCheck;
  }, [runScheduledCheck]);

  useEffect(() => {
    if (!settings.enabled) {
      return;
    }

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    const intervalId = setInterval(() => {
      void tickRef.current?.();
    }, intervalMs);

    const initialId = setTimeout(() => {
      void tickRef.current?.();
    }, 1500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialId);
    };
  }, [settings.enabled, settings.intervalMinutes]);

  return {
    settings,
    setEnabled,
    setIntervalMinutes,
    isBulkTranslating,
    retryAllPending,
    lastCheckAt,
    lastTickResult,
    runScheduledCheck,
  };
}
