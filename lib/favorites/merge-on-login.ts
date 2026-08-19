'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { readFavoriteIds, writeFavoriteIds } from './storage';

async function mergeLocalFavorites(): Promise<boolean> {
  const localIds = readFavoriteIds();
  if (localIds.length === 0) return true;

  const response = await fetch('/api/favorites/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingIds: localIds }),
  });

  if (!response.ok) return false;

  writeFavoriteIds([]);
  return true;
}

/** D-96: merge pre-login localStorage favorites into Supabase once per session. */
export function useMergeFavoritesOnLogin() {
  const mergedRef = useRef(false);

  useEffect(() => {
    if (!getSupabaseEnv()) return;

    const supabase = createClient();

    const tryMerge = async () => {
      if (mergedRef.current) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const ok = await mergeLocalFavorites();
      if (ok) mergedRef.current = true;
    };

    void tryMerge();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        mergedRef.current = false;
        void tryMerge();
      }
      if (event === 'SIGNED_OUT') {
        mergedRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
