'use client';

import { useTranslationQueuePollingContext } from '@/components/admin/TranslationQueuePollingProvider';

export function useRetryAllPendingTranslations() {
  const { retryAllPending, isBulkTranslating } = useTranslationQueuePollingContext();
  return { retryAllPending, isBulkTranslating };
}
