'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  setMapSearchOpen,
  toggleMapSearchOpen,
  useMapSearchOpen,
} from '@/lib/ui/map-search-ui';
import { useMessages } from '@/lib/i18n/useMessages';

// Both pull the radix/vaul overlay stack, and both start closed. Keeping them out
// of app/layout.js matters: the dev server truncates that chunk at exactly 2 MiB
// while webpack rewrites it, so the browser gets an unparseable chunk, hydration
// dies, and the map's dynamic import strands on its loading fallback forever.
// A bare import() does not split in Next's dev webpack build; next/dynamic does.
const NavMenuDrawer = dynamic(
  () => import('@/components/shell/NavMenuDrawer').then((mod) => mod.NavMenuDrawer),
  { ssr: false },
);

const HeaderLanguageDropdown = dynamic(
  () =>
    import('@/components/shell/HeaderLanguageDropdown').then(
      (mod) => mod.HeaderLanguageDropdown,
    ),
  { ssr: false },
);

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
          <div className="flex items-center gap-space-xs">
            <HeaderLanguageDropdown />
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
        </div>
      </header>
      <NavMenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
