'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';

/** Consumer shell: bottom nav on main routes; no global Header (retired in Phase 9). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isListingDetail = pathname.startsWith('/listing/');

  if (isAdmin) {
    return (
      <div className="app-shell">
        <div className="app-main">{children}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-main">{children}</div>
      {!isListingDetail && <BottomNav />}
    </div>
  );
}
