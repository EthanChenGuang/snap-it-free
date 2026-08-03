'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { NavMenuDrawer } from '@/components/shell/NavMenuDrawer';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const onFavorites = pathname.startsWith('/favorites');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="relative z-[100] isolate w-full shrink-0 border-b border-outline-variant bg-surface">
        <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-space-md">
          <button
            type="button"
            className="relative z-[101] flex min-h-11 min-w-11 touch-manipulation cursor-pointer items-center justify-center gap-space-sm transition-opacity active:opacity-80"
            aria-label={messages.header.menu}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
          >
            <span className="material-symbols-outlined text-primary">menu</span>
          </button>
        <Link
          href="/"
          className="flex items-center gap-space-sm transition-opacity hover:opacity-80"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent-orange text-xs font-bold text-on-primary">
            手
          </div>
          <span className="text-h3 font-bold text-on-surface">{messages.app.title}</span>
        </Link>
        <Link
          href="/favorites"
          className={cn(
            'flex cursor-pointer items-center gap-space-sm transition-opacity active:opacity-80',
            onFavorites ? 'text-accent-orange' : 'text-primary hover:opacity-80',
          )}
          aria-label={messages.header.favorites}
          aria-current={onFavorites ? 'page' : undefined}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: onFavorites
                ? "'FILL' 1, 'wght' 600"
                : "'FILL' 0, 'wght' 400",
            }}
          >
            favorite
          </span>
        </Link>
      </div>
    </header>
    <NavMenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
