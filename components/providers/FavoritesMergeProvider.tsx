'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// A bare import() does not split in Next's dev webpack build, so the Supabase SDK
// would stay in app/layout.js — a 5 MB chunk the dev server truncates mid-transfer,
// which kills hydration and strands the map on its loading fallback. next/dynamic
// does split in dev, so the effect and its Supabase dependency load separately.
// The catch keeps a failed chunk fetch (dev recompiles and restarts drop the file
// mid-flight) from throwing out of the root layout and blanking the whole app —
// login-time favorite merging is the only thing lost.
const FavoritesMergeEffect = dynamic(
  () =>
    import('./FavoritesMergeEffect')
      .then((mod) => mod.FavoritesMergeEffect)
      .catch((error) => {
        console.error('[favorites] merge effect chunk failed to load', error);
        return () => null;
      }),
  { ssr: false },
);

export function FavoritesMergeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <FavoritesMergeEffect />
      </Suspense>
    </>
  );
}
