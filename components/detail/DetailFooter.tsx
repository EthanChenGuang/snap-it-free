'use client';

import Link from 'next/link';
import { useMessages } from '@/lib/i18n/useMessages';

export function DetailFooter() {
  const { messages } = useMessages();

  return (
    <footer className="mx-auto mt-space-xl max-w-container-max border-t border-outline-variant px-gutter py-space-xl">
      <div className="flex flex-col items-start justify-between gap-space-md md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-h3 font-bold text-primary">{messages.app.title}</p>
          <p className="text-label-sm text-secondary">{messages.detail.footerTagline}</p>
        </div>
        <div className="flex gap-space-lg text-label-md text-on-surface-variant">
          <Link href="/privacy" className="transition-colors hover:text-primary">
            {messages.detail.footerPrivacy}
          </Link>
          <Link href="/settings" className="transition-colors hover:text-primary">
            {messages.detail.footerSafety}
          </Link>
          <Link href="/settings" className="transition-colors hover:text-primary">
            {messages.detail.footerContact}
          </Link>
        </div>
      </div>
    </footer>
  );
}
