'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type NavMenuDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavMenuDrawer({ open, onOpenChange }: NavMenuDrawerProps) {
  const { messages } = useMessages();
  const pathname = usePathname();

  const menuItems = [
    { href: '/', icon: 'grid_view', label: messages.nav.home, exact: true as const },
    { href: '/post', icon: 'add_box', label: messages.nav.post },
    { href: '/favorites', icon: 'favorite', label: messages.header.favorites },
    { href: '/post/manage', icon: 'inventory_2', label: messages.post.manageLink },
    { href: '/settings', icon: 'settings', label: messages.nav.settings },
  ];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 touch-manipulation"
        aria-label={messages.header.menuClose}
        onClick={() => onOpenChange(false)}
      />
      <nav
        className="absolute left-0 top-0 flex h-full w-[min(280px,85vw)] flex-col border-r border-outline-variant bg-surface shadow-none"
        aria-label={messages.header.menu}
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-gutter py-space-md">
          <p className="text-h3 font-bold text-on-surface">{messages.app.title}</p>
          <button
            type="button"
            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container active:opacity-80"
            aria-label={messages.header.menuClose}
            onClick={() => onOpenChange(false)}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-space-xs overflow-y-auto p-gutter">
          {menuItems.map((item) => {
            const active = isActive(pathname, item.href, 'exact' in item && item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex touch-manipulation items-center gap-space-md rounded px-space-md py-space-sm text-body-md transition-colors active:opacity-80',
                  active
                    ? 'bg-surface-container font-semibold text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    fontVariationSettings: active
                      ? "'FILL' 1, 'wght' 600"
                      : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
