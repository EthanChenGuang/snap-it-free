import { crawlHashForListing, type CrawlHashListing } from './crawl-hash.js';
import type { RawListing } from './extract.js';

export type EarlyStopListing = RawListing & {
  price?: string;
  image_urls?: string[];
};

export type ApplyEarlyStopInput = {
  listings: EarlyStopListing[];
  knownMap: Map<string, string>;
  earlyStopK: number;
  isFullRefresh: boolean;
};

export type ApplyEarlyStopResult = {
  workQueue: EarlyStopListing[];
  touchCandidates: EarlyStopListing[];
  listingsSkippedAtCrawl: number;
  stoppedEarly: boolean;
};

function isKnownUnchanged(listing: EarlyStopListing, knownMap: Map<string, string>): boolean {
  const knownHash = knownMap.get(listing.external_id);
  if (knownHash === undefined) return false;
  const currentHash = crawlHashForListing(listing as CrawlHashListing);
  return knownHash === currentHash;
}

export function applyEarlyStop(input: ApplyEarlyStopInput): ApplyEarlyStopResult {
  const { listings, knownMap, earlyStopK, isFullRefresh } = input;
  const workQueue: EarlyStopListing[] = [];
  const touchCandidates: EarlyStopListing[] = [];
  let consecutiveKnown = 0;
  let listingsSkippedAtCrawl = 0;
  let stoppedEarly = false;

  for (const listing of listings) {
    if (isKnownUnchanged(listing, knownMap)) {
      consecutiveKnown += 1;
      listingsSkippedAtCrawl += 1;

      if (isFullRefresh) {
        touchCandidates.push(listing);
      }

      if (!isFullRefresh && consecutiveKnown >= earlyStopK) {
        stoppedEarly = true;
        break;
      }
      continue;
    }

    consecutiveKnown = 0;
    workQueue.push(listing);
  }

  return {
    workQueue,
    touchCandidates,
    listingsSkippedAtCrawl,
    stoppedEarly,
  };
}
