'use client';

import { useMessages } from '@/lib/i18n/useMessages';

const SKELETON_CARDS = 6;

/**
 * Feed "searching" state: an animated magnifier with "Searching for free items…" and shimmering cards shaped
 * like ListListingCard, so the grid does not jump when the real cards arrive. Used while the first full feed
 * fetch is in flight (FeedHomeClient) and during the route transition to `/` (app/(feed)/loading.tsx).
 */
export function FeedSearching({ label }: { label?: string }) {
  const { messages } = useMessages();
  const text = label ?? messages.feed.searching;

  return (
    <div role="status" aria-live="polite" data-testid="feed-searching">
      <div className="mb-space-md flex items-center gap-space-sm px-0.5">
        <span className="feed-searching-lens relative flex h-6 w-6 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 rounded-full border border-on-surface/15 feed-searching-ring" />
          <span
            className="material-symbols-outlined text-[18px] text-on-surface"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            search
          </span>
        </span>
        <span className="text-label-sm font-medium text-on-surface-variant">{text}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-space-md gap-y-space-lg sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div key={index} className="flex flex-col" style={{ animationDelay: `${index * 90}ms` }}>
            <div className="feed-skeleton aspect-[4/5] rounded-2xl" />
            <div className="feed-skeleton mt-3.5 h-4 w-4/5 rounded-full" />
            <div className="feed-skeleton mt-2 h-3 w-1/2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
