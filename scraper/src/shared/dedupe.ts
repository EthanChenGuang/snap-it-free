import { createHash } from 'node:crypto';
import type { CanonicalListing } from './schema.js';

export function contentHash(listing: Omit<CanonicalListing, 'content_hash'>): string {
  const payload = `${listing.title}|${listing.photo_url}|${listing.lat}|${listing.lng}`;
  return createHash('sha256').update(payload).digest('hex');
}
