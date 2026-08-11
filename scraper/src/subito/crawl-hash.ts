import { createHash } from 'node:crypto';

export type CrawlHashFields = {
  title: string;
  price: string;
  images: string;
  posted_at: string;
};

export function crawlContentHash(fields: CrawlHashFields): string {
  const payload = `${fields.title}|${fields.price}|${fields.images}|${fields.posted_at}`;
  return createHash('sha256').update(payload).digest('hex');
}

export type CrawlHashListing = {
  title: string;
  price?: string;
  photo_url: string;
  image_urls?: string[];
  posted_at: string;
};

export function crawlHashForListing(listing: CrawlHashListing): string {
  const images =
    listing.image_urls && listing.image_urls.length > 0
      ? listing.image_urls.join(',')
      : listing.photo_url;
  return crawlContentHash({
    title: listing.title,
    price: listing.price ?? '',
    images,
    posted_at: listing.posted_at,
  });
}
