'use client';

import Link from 'next/link';
import { messages } from '@/messages/it';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface">
      <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-space-md">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-space-sm transition-opacity active:opacity-80"
          aria-label={messages.header.menu}
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
        <button
          type="button"
          className="flex cursor-pointer items-center gap-space-sm transition-opacity active:opacity-80"
          aria-label={messages.header.search}
        >
          <span className="material-symbols-outlined text-primary">search</span>
        </button>
      </div>
    </header>
  );
}
