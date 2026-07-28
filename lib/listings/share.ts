import type { ListingRow } from './types';

export type ShareResult = 'shared' | 'copied' | 'failed';

export async function shareListing(listing: ListingRow): Promise<ShareResult> {
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/listing/${listing.id}`
      : `/listing/${listing.id}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: listing.title, url });
      return 'shared';
    } catch {
      // User dismissed share sheet — fall through to clipboard
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
