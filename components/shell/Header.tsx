'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NavMenuDrawer } from '@/components/shell/NavMenuDrawer';
import {
  setMapSearchOpen,
  toggleMapSearchOpen,
  useMapSearchOpen,
} from '@/lib/ui/map-search-ui';
import { useMessages } from '@/lib/i18n/useMessages';

export function Header() {
  const { messages } = useMessages();

  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const searchOpen = useMapSearchOpen();

  const handleSearchClick = () => {
    if (pathname !== '/') {
      setMapSearchOpen(true);
      router.push('/');
      return;
    }
    toggleMapSearchOpen();
  };

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
            className="transition-opacity hover:opacity-80"
          >
            <span className="text-h3 font-bold text-on-surface">{messages.app.title}</span>
          </Link>
          <button
            type="button"
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-opacity active:opacity-80"
            aria-label={messages.header.search}
            aria-pressed={pathname === '/' ? searchOpen : undefined}
            onClick={handleSearchClick}
          >
            <span className="material-symbols-outlined text-primary">search</span>
          </button>
        </div>
      </header>
      <NavMenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
