'use client';

import { useMergeFavoritesOnLogin } from '@/lib/favorites/merge-on-login';

export function FavoritesMergeProvider({ children }: { children: React.ReactNode }) {
  useMergeFavoritesOnLogin();
  return children;
}
