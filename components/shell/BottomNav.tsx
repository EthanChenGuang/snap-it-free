'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

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

  const navItems: NavItem[] = [
    { href: '/', icon: 'grid_view', label: messages.nav.home },
    { href: '/post', icon: 'add_box', label: messages.nav.post, authGate: true },
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
      <nav className="relative z-[100] flex w-full shrink-0 items-center justify-around border-t border-outline-variant bg-surface px-gutter py-space-sm">
        {navItems.map((item) => {
          const isActive = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleNavClick(event, item)}
              className={cn(
                'relative flex flex-col items-center justify-center px-space-sm py-space-xs transition-transform duration-200 active:scale-95',
                isActive ? 'font-bold text-primary' : 'text-secondary',
              )}
            >
              <span className="relative">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    fontVariationSettings: isActive
                      ? "'FILL' 1, 'wght' 400"
                      : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {item.icon}
                </span>
                {item.showBadge && <UnreadMatchBadge />}
              </span>
              <span className="mt-space-xs text-label-sm font-label-sm">{item.label}</span>
            </Link>
          );
        })}
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
