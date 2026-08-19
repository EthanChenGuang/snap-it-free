'use client';

import { SerwistProvider } from '@serwist/next/react';

const isDev = process.env.NODE_ENV === 'development';

// disable={isDev}: dev's inline DEV_UNREGISTER_SW_SCRIPT (app/layout.tsx) unregisters
// any service worker on every load. Without this, SerwistProvider re-registers one right
// after, the new SW's controllerchange triggers @serwist/window's reload-on-activate,
// and the unregister/register/reload cycle repeats forever (see next.config.ts).
export function AppSerwistProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/sw.js" disable={isDev}>
      {children}
    </SerwistProvider>
  );
}
