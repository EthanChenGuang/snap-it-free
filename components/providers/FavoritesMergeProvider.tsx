'use client';

import dynamic from 'next/dynamic';

// A bare import() does not split in Next's dev webpack build, so the Supabase SDK
// would stay in app/layout.js — a 5 MB chunk the dev server truncates mid-transfer,
// which kills hydration and strands the map on its loading fallback. next/dynamic
// does split in dev, so the effect and its Supabase dependency load separately.
const FavoritesMergeEffect = dynamic(
  () => import('./FavoritesMergeEffect').then((mod) => mod.FavoritesMergeEffect),
  { ssr: false },
);

export function FavoritesMergeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FavoritesMergeEffect />
    </>
  );
}
