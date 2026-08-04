'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { Header } from '@/components/shell/Header';

/** Hides global Header on listing detail — detail pages use DetailTopBar instead. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isListingDetail = pathname.startsWith('/listing/');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {!isListingDetail && <Header />}
      <div className="app-main">{children}</div>
      <BottomNav />
    </div>
  );
}
