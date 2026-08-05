'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

// The badge pulls in the Supabase SDK. Loading it via next/dynamic keeps that out of
// app/layout.js, which the dev server truncates once it grows past a few megabytes.
const UnreadMatchBadge = dynamic(
  () => import('./UnreadMatchBadge').then((mod) => mod.UnreadMatchBadge),
  { ssr: false },
);

export function BottomNav() {
  const pathname = usePathname();
  const { messages } = useMessages();

  const navItems = [
    { href: '/', icon: 'map', label: messages.nav.map },
    { href: '/list', icon: 'format_list_bulleted', label: messages.nav.list },
    { href: '/post', icon: 'add_box', label: messages.nav.post },
    { href: '/settings', icon: 'settings', label: messages.nav.settings, showBadge: true },
  ] as const;

  return (
    <nav className="relative z-[100] flex w-full shrink-0 items-center justify-around border-t border-outline-variant bg-surface px-gutter py-space-sm">
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : item.href === '/list'
              ? pathname === '/list'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showBadge = 'showBadge' in item && item.showBadge;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center justify-center px-space-sm py-space-xs transition-transform duration-200 active:scale-95',
              isActive ? 'font-bold text-primary' : 'text-secondary',
            )}
          >
            <span className="relative">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  fontVariationSettings: "'FILL' 0, 'wght' 400",
                }}
              >
                {item.icon}
              </span>
              {showBadge && <UnreadMatchBadge />}
            </span>
            <span className="mt-space-xs text-label-sm font-label-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
