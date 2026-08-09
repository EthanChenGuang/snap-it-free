'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { FeedHeaderRow } from '@/components/shell/FeedHeaderRow';

/** Consumer shell: route-conditional chrome; feed header on `/` only (Phase 9). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isListingDetail = pathname.startsWith('/listing/');
  const showFeedHeader = pathname === '/';

  if (isAdmin) {
    return (
      <div className="app-shell">
        <div className="app-main">{children}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {showFeedHeader && (
        <FeedHeaderRow searchQuery="" onSearchQueryChange={() => {}} />
      )}
      <div className="app-main">{children}</div>
      {!isListingDetail && <BottomNav />}
    </div>
  );
}
