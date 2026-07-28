'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FAVORITES_CHANGE_EVENT,
  readFavoriteIds,
  toggleFavoriteId,
} from './storage';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFavoriteIds(readFavoriteIds());
    setHydrated(true);

    const sync = () => setFavoriteIds(readFavoriteIds());
    window.addEventListener(FAVORITES_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds],
  );

  const toggle = useCallback((id: string) => {
    const next = toggleFavoriteId(id);
    setFavoriteIds(next);
    return next.includes(id);
  }, []);

  return {
    favoriteIds,
    hydrated,
    isFavorite,
    toggle,
  };
}
