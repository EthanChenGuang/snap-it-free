'use client';

import '@/app/feed-home.css';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { FeedHeaderRow } from '@/components/shell/FeedHeaderRow';
import { FeedFilterProvider } from '@/components/shell/FeedFilterContext';
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
  const showMessagesTitle = pathname === '/messages';
  const showSettingsTitle = pathname === '/settings';
  const isMessageThread = /^\/messages\/[^/]+$/.test(pathname);
  const showSimpleTitle = showFavoritesTitle || showMessagesTitle || showSettingsTitle;
  const showBottomNav = !isListingDetail && !isSelectLocation && !isMessageThread;

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
      <FeedFilterProvider>
        <FeedScrollProvider>
          <div className="app-shell">
            <FeedHeaderRow />
            <div className="app-main min-h-0">{children}</div>
          </div>
          {showBottomNav && <BottomNav />}
        </FeedScrollProvider>
      </FeedFilterProvider>
    );
  }

  return (
    <div className="app-shell">
      {showSimpleTitle && (
        <SimpleTitleBar
          title={
            showFavoritesTitle
              ? messages.favorites.pageTitle
              : showMessagesTitle
                ? messages.inbox.pageTitle
                : messages.app.title
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
