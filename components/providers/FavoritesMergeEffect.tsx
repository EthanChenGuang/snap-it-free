'use client';

import { useMergeFavoritesOnLogin } from '@/lib/favorites/merge-on-login';

/** Headless — kept in its own chunk so the Supabase SDK stays out of the root layout. */
export function FavoritesMergeEffect() {
  useMergeFavoritesOnLogin();
  return null;
}
