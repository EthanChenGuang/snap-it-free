'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { FeedHeaderRow } from '@/components/shell/FeedHeaderRow';
import { FeedScrollProvider } from '@/components/shell/FeedScrollContext';
import { SimpleTitleBar } from '@/components/shell/SimpleTitleBar';
import { useMessages } from '@/lib/i18n/useMessages';

/** Consumer shell: route-conditional chrome; feed header on `/` only (Phase 9). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { messages } = useMessages();
  const isAdmin = pathname.startsWith('/admin');
  const isListingDetail = pathname.startsWith('/listing/');
  const showFeedHeader = pathname === '/';
  const showFavoritesTitle = pathname === '/favorites';
  const showSettingsTitle = pathname === '/settings';
  const showSimpleTitle = showFavoritesTitle || showSettingsTitle;

  if (isAdmin) {
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
          <div className="app-main">{children}</div>
          {!isListingDetail && <BottomNav />}
        </div>
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
      <div className="app-main">{children}</div>
      {!isListingDetail && <BottomNav />}
    </div>
  );
}
