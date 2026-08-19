/** Scraped (Subito) listings remain visible for 30 days from posted_at (or re-scrape). */
export const SCRAPED_LISTING_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Extend from posted_at while still inside the window; otherwise extend from now when re-seen. */
export function computeScrapedListingExpiresAt(postedAt: Date, now = new Date()): Date {
  const fromPosted = postedAt.getTime() + SCRAPED_LISTING_TTL_MS;
  if (fromPosted > now.getTime()) {
    return new Date(fromPosted);
  }
  return new Date(now.getTime() + SCRAPED_LISTING_TTL_MS);
}
