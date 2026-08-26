import { applyEarlyStop, type EarlyStopListing } from '../subito/early-stop.js';
import { isFreePrice } from './filters.js';
import {
  parseWallapopSearchResponse,
  WallapopParseError,
  type WallapopSearchListing,
} from './http-extract.js';

export function processWallapopSearchBody(
  body: string,
  seedUrl: string,
  knownMap: Map<string, string>,
  earlyStopK: number,
  isFullRefresh: boolean,
): {
  workQueue: WallapopSearchListing[];
  touchCandidates: WallapopSearchListing[];
  listingsSkippedAtCrawl: number;
  jsonFieldCompleteness: number;
  notFreeRejected: number;
  blocked: boolean;
  stoppedEarly: boolean;
} {
  try {
    const parsed = parseWallapopSearchResponse(body, seedUrl);
    const freeListings: WallapopSearchListing[] = [];
    let notFreeRejected = 0;

    for (const listing of parsed.listings) {
      if (!isFreePrice(listing.price)) {
        notFreeRejected += 1;
        continue;
      }
      freeListings.push(listing);
    }

    const early = applyEarlyStop({
      listings: freeListings as EarlyStopListing[],
      knownMap,
      earlyStopK,
      isFullRefresh,
    });

    return {
      workQueue: early.workQueue as WallapopSearchListing[],
      touchCandidates: early.touchCandidates as WallapopSearchListing[],
      listingsSkippedAtCrawl: early.listingsSkippedAtCrawl,
      jsonFieldCompleteness: parsed.jsonFieldCompleteness,
      notFreeRejected,
      blocked: false,
      stoppedEarly: early.stoppedEarly,
    };
  } catch (error) {
    if (error instanceof WallapopParseError) {
      return {
        workQueue: [],
        touchCandidates: [],
        listingsSkippedAtCrawl: 0,
        jsonFieldCompleteness: 0,
        notFreeRejected: 0,
        blocked: true,
        stoppedEarly: false,
      };
    }
    throw error;
  }
}
