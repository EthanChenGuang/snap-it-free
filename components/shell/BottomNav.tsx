'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUnreadMatchCount } from '@/lib/alerts/useUnreadMatchCount';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: 'map', label: messages.nav.map },
  { href: '/list', icon: 'format_list_bulleted', label: messages.nav.list },
  { href: '/post', icon: 'add_box', label: messages.nav.post },
  { href: '/settings', icon: 'settings', label: messages.nav.settings, showBadge: true },
] as const;

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

export function BottomNav() {
  const pathname = usePathname();
  const { count: unreadMatchCount } = useUnreadMatchCount();

  return (
    <nav className="relative z-[100] flex w-full shrink-0 items-center justify-around border-t border-outline-variant bg-surface px-gutter py-space-sm">
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : item.href === '/list'
              ? pathname === '/list'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showBadge =
          'showBadge' in item && item.showBadge && unreadMatchCount > 0;

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
              {showBadge && (
                <span
                  className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-[3px] text-[9px] font-bold leading-none text-on-primary"
                  aria-label={messages.settings.matches.badgeLabel(unreadMatchCount)}
                >
                  {badgeLabel(unreadMatchCount)}
                </span>
              )}
            </span>
            <span className="mt-space-xs text-label-sm font-label-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
