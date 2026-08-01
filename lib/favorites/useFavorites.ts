'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FAVORITES_CHANGE_EVENT,
  readFavoriteIds,
  toggleFavoriteId,
  writeFavoriteIds,
} from './storage';

async function fetchRemoteFavoriteIds(): Promise<string[] | null> {
  const response = await fetch('/api/favorites');
  if (response.status === 401) return null;
  if (!response.ok) return null;
  const data = (await response.json()) as { listingIds?: string[] };
  return data.listingIds ?? [];
}

function dispatchFavoritesChange(ids: string[]) {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: ids }));
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const loadFavorites = useCallback(async (authed: boolean) => {
    if (authed) {
      const remoteIds = await fetchRemoteFavoriteIds();
      if (remoteIds !== null) {
        setFavoriteIds(remoteIds);
        writeFavoriteIds(remoteIds);
        dispatchFavoritesChange(remoteIds);
        return;
      }
    }

    const localIds = readFavoriteIds();
    setFavoriteIds(localIds);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authed = Boolean(session);
      setIsAuthed(authed);
      await loadFavorites(authed);
      setHydrated(true);
    };

    void init();

    const syncLocal = () => setFavoriteIds(readFavoriteIds());
    window.addEventListener(FAVORITES_CHANGE_EVENT, syncLocal);
    window.addEventListener('storage', syncLocal);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = Boolean(session);
      setIsAuthed(authed);
      void loadFavorites(authed);
    });

    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, syncLocal);
      window.removeEventListener('storage', syncLocal);
      subscription.unsubscribe();
    };
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds],
  );

  const toggle = useCallback(
    async (id: string) => {
      if (isAuthed) {
        const removing = favoriteIds.includes(id);
        const response = removing
          ? await fetch(`/api/favorites?listingId=${encodeURIComponent(id)}`, {
              method: 'DELETE',
            })
          : await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ listingId: id }),
            });

        if (!response.ok) {
          return favoriteIds.includes(id);
        }

        const next = removing
          ? favoriteIds.filter((item) => item !== id)
          : [...favoriteIds, id];
        setFavoriteIds(next);
        writeFavoriteIds(next);
        dispatchFavoritesChange(next);
        return !removing;
      }

      const next = toggleFavoriteId(id);
      setFavoriteIds(next);
      return next.includes(id);
    },
    [favoriteIds, isAuthed],
  );

  return {
    favoriteIds,
    hydrated,
    isAuthed,
    isFavorite,
    toggle,
  };
}
