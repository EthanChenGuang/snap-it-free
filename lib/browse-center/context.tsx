'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';
import {
  readBrowseCenter,
  subscribeBrowseCenter,
  writeBrowseCenter,
  type BrowseCenter,
} from './storage';

const BrowseCenterContext = createContext<BrowseCenter | null>(null);

export function BrowseCenterProvider({ children }: { children: React.ReactNode }) {
  const center = useSyncExternalStore(subscribeBrowseCenter, readBrowseCenter, () => null);

  return (
    <BrowseCenterContext.Provider value={center}>{children}</BrowseCenterContext.Provider>
  );
}

export function useBrowseCenter(): BrowseCenter | null {
  return useContext(BrowseCenterContext);
}

export { writeBrowseCenter };
