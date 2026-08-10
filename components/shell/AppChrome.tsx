'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { FeedHeaderRow } from '@/components/shell/FeedHeaderRow';
import { FeedScrollProvider } from '@/components/shell/FeedScrollContext';
import { SimpleTitleBar } from '@/components/shell/SimpleTitleBar';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

/** Consumer shell: route-conditional chrome; feed header on `/` only (Phase 9). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { messages } = useMessages();
  const isAdmin = pathname.startsWith('/admin');
  const isListingDetail = pathname.startsWith('/listing/');
  const isSelectLocation = pathname === '/select-location';
  const showFeedHeader = pathname === '/';
  const showFavoritesTitle = pathname === '/favorites';
  const showSettingsTitle = pathname === '/settings';
  const showSimpleTitle = showFavoritesTitle || showSettingsTitle;
  const showBottomNav = !isListingDetail && !isSelectLocation;

  if (isAdmin) {
    return (
      <div className="app-shell">
        <div className="app-main">{children}</div>
      </div>
    );
  }

  if (isSelectLocation) {
    return (
      <div className="app-shell">
        <div className="app-main">{children}</div>
      </div>
    );
  }

  if (showFeedHeader) {
    return (
      <FeedScrollProvider>
        <div className="app-shell">
          <FeedHeaderRow />
          <div className="app-main min-h-0">{children}</div>
        </div>
        {showBottomNav && <BottomNav />}
      </FeedScrollProvider>
    );
  }

  return (
    <div className="app-shell">
      {showSimpleTitle && (
        <SimpleTitleBar
          title={
            showFavoritesTitle ? messages.favorites.pageTitle : messages.app.title
          }
        />
      )}
      <div
        className={cn(
          'app-main',
          showBottomNav && 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        {children}
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
