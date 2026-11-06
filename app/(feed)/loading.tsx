import { FeedSearching } from '@/components/listings/FeedSearching';

/** Shown the moment `/` is navigated to (e.g. back from Stripe Checkout) while the server renders the feed. */
export default function FeedLoading() {
  return (
    <main className="feed-home flex h-full min-h-0 flex-col overflow-hidden">
      <div className="no-scrollbar h-full flex-1 overflow-hidden px-gutter pt-space-xs">
        <FeedSearching />
      </div>
    </main>
  );
}
