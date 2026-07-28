'use client';

import type { ListingRow } from '@/lib/listings/types';

type ScrapedListingShellProps = {
  listing: ListingRow;
};

/** Minimal shell — expanded in Task 2 with metadata, CTAs, iframe fallback. */
export function ScrapedListingShell({ listing }: ScrapedListingShellProps) {
  return (
    <main className="mx-auto max-w-container-max px-gutter py-space-md pb-32">
      <h1 className="text-h3 font-bold text-on-surface">{listing.title}</h1>
    </main>
  );
}
