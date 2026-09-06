'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  removeFavorite,
  subscribeFavorites,
  toggleFavorite,
} from './store';

export function useFavorites() {
  const { favoriteIds, hydrated, isAuthed } = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds],
  );

  return {
    favoriteIds,
    hydrated,
    isAuthed,
    isFavorite,
    toggle: toggleFavorite,
    remove: removeFavorite,
  };
}
