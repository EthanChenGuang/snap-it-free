'use client';

import { createContext, useContext } from 'react';
import { useAutoTranslateAll } from '@/hooks/useAutoTranslateAll';

type AutoTranslateContextValue = ReturnType<typeof useAutoTranslateAll>;

const AutoTranslateContext = createContext<AutoTranslateContextValue | null>(null);

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const value = useAutoTranslateAll();
  return <AutoTranslateContext.Provider value={value}>{children}</AutoTranslateContext.Provider>;
}

export function useAutoTranslateContext(): AutoTranslateContextValue {
  const context = useContext(AutoTranslateContext);
  if (!context) {
    throw new Error('useAutoTranslateContext must be used within AutoTranslateProvider');
  }
  return context;
}
