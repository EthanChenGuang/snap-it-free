'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useFeedScrollOptional } from '@/components/shell/FeedScrollContext';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

const ICON_STYLE_OUTLINE = "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24";
const ICON_STYLE_ACTIVE = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";

// The badge pulls in the Supabase SDK. Loading it via next/dynamic keeps that out of
// app/layout.js, which the dev server truncates once it grows past a few megabytes.
const UnreadMatchBadge = dynamic(
  () => import('./UnreadMatchBadge').then((mod) => mod.UnreadMatchBadge),
  { ssr: false },
);

type NavItem = {
  href: string;
  icon: string;
  label: string;
  showBadge?: boolean;
  authGate?: boolean;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const { messages } = useMessages();
  const { user, loading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);
  const feedScroll = useFeedScrollOptional();
  const navHidden = pathname === '/' && (feedScroll?.headerHidden ?? false);

  if (pathname === '/select-location') {
    return null;
  }

  const navItems: NavItem[] = [
    { href: '/', icon: 'home', label: messages.nav.home },
    { href: '/post', icon: 'add_a_photo', label: messages.nav.post, authGate: true },
    { href: '/favorites', icon: 'favorite', label: messages.nav.favorites },
    { href: '/settings', icon: 'settings', label: messages.nav.settings, showBadge: true },
  ];

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    item: NavItem,
  ) => {
    if (!item.authGate || loading || user) {
      return;
    }
    event.preventDefault();
    setAuthOpen(true);
  };

  return (
    <>
      <nav
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-gutter pb-[env(safe-area-inset-bottom,0px)] transition-all duration-200 ease-out',
          navHidden && 'translate-y-[calc(100%+2rem)] opacity-0',
        )}
      >
        <div className="pointer-events-auto flex items-center gap-space-lg rounded-full border border-white/20 bg-white/70 px-space-lg py-space-sm shadow-lg backdrop-blur-md">
          {navItems.map((item) => {
            const isActive = isNavActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavClick(event, item)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center transition-transform duration-200 active:scale-95',
                  isActive ? 'text-error' : 'text-on-surface-variant',
                )}
              >
                <span className="relative">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{
                      fontVariationSettings: isActive ? ICON_STYLE_ACTIVE : ICON_STYLE_OUTLINE,
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.showBadge && <UnreadMatchBadge />}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/post"
        modalTitle={messages.auth.modalTitle}
      />
    </>
  );
}
