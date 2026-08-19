'use client';

import { createContext, useContext } from 'react';
import {
  useTranslationQueuePolling,
  type TranslationQueuePollingValue,
} from '@/hooks/useTranslationQueuePolling';

const TranslationQueuePollingContext = createContext<TranslationQueuePollingValue | null>(
  null,
);

export function useTranslationQueuePollingContext(): TranslationQueuePollingValue {
  const context = useContext(TranslationQueuePollingContext);
  if (!context) {
    throw new Error(
      'useTranslationQueuePollingContext must be used within TranslationQueuePollingProvider',
    );
  }
  return context;
}

type TranslationQueuePollingProviderProps = {
  initialCount: number;
  children: React.ReactNode;
};

export function TranslationQueuePollingProvider({
  initialCount,
  children,
}: TranslationQueuePollingProviderProps) {
  const value = useTranslationQueuePolling(initialCount);
  return (
    <TranslationQueuePollingContext.Provider value={value}>
      {children}
    </TranslationQueuePollingContext.Provider>
  );
}
