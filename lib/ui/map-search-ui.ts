'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

let searchOpen = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getMapSearchOpen(): boolean {
  return searchOpen;
}

export function setMapSearchOpen(open: boolean): void {
  if (searchOpen === open) return;
  searchOpen = open;
  emit();
}

export function toggleMapSearchOpen(): void {
  setMapSearchOpen(!searchOpen);
}

export function subscribeMapSearch(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shared map search open state (Header ↔ MapExplorer). Closes when leaving `/`. */
export function useMapSearchOpen(): boolean {
  const open = useSyncExternalStore(
    subscribeMapSearch,
    getMapSearchOpen,
    () => false,
  );
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') {
      setMapSearchOpen(false);
    }
  }, [pathname]);

  return open;
}
