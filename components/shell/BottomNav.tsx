'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: 'map', label: messages.nav.map },
  { href: '/list', icon: 'format_list_bulleted', label: messages.nav.list },
  { href: '/post', icon: 'add_box', label: messages.nav.post },
  { href: '/settings', icon: 'settings', label: messages.nav.settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-outline-variant bg-surface px-gutter py-space-sm">
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center rounded px-space-sm py-space-xs transition-all duration-150 active:scale-95',
              isActive
                ? 'bg-surface-container font-semibold text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface',
            )}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 600"
                  : "'FILL' 0, 'wght' 400",
              }}
            >
              {item.icon}
            </span>
            <span className="mt-space-xs text-[11px] font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
