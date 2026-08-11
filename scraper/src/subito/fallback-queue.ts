import { isMislabeledFree } from '../shared/free-filter.js';
import type { EarlyStopListing } from './early-stop.js';

/** Title keyword scan for paid signals on regalo listings (D-15-12). */
const PAID_TITLE_KEYWORDS = /\b(vendesi|vendo|€|prezzo|euro|pagamento|trattativa)\b/i;

export function hasPaidSignalInTitle(title: string): boolean {
  return PAID_TITLE_KEYWORDS.test(title);
}

export function isPriceAmbiguousOrMissing(price: string | undefined): boolean {
  if (price === undefined || price.trim() === '') return true;
  const normalized = price.trim().toLowerCase();
  if (normalized === '0' || normalized === 'gratis' || normalized === 'regalo' || normalized === 'free') {
    return false;
  }
  const digits = normalized.replace(/\D/g, '');
  if (digits.length > 0 && !/^0+$/.test(digits)) return true;
  return false;
}

/**
 * Detail enrichment only when coords still null after centroid OR price ambiguous/missing
 * after title keyword scan (D-15-11, D-15-12).
 */
export function shouldVisitDetail(entry: EarlyStopListing): boolean {
  const hasCoords = entry.lat != null && entry.lng != null;
  if (!hasCoords) return true;

  if (isPriceAmbiguousOrMissing(entry.price)) return true;
  if (hasPaidSignalInTitle(entry.title)) return true;
  if (isMislabeledFree(entry.title, entry.description)) return true;

  return false;
}

/** Detail visit cap: ceil(10% of listings seen this run) — D-15-16. */
export function detailBudgetCap(listingsSeen: number): number {
  return Math.ceil(0.1 * listingsSeen);
}

export function remainingDetailBudget(listingsSeen: number, used: number): number {
  return Math.max(0, detailBudgetCap(listingsSeen) - used);
}

export type DetailSelectionResult = {
  selected: EarlyStopListing[];
  deferred: EarlyStopListing[];
};

export function selectDetailCandidates(
  workQueue: EarlyStopListing[],
  budget: number,
): DetailSelectionResult {
  const selected: EarlyStopListing[] = [];
  const deferred: EarlyStopListing[] = [];

  for (const entry of workQueue) {
    if (!shouldVisitDetail(entry)) continue;

    if (selected.length < budget) {
      selected.push(entry);
    } else {
      deferred.push(entry);
    }
  }

  return { selected, deferred };
}

/** Playwright fallback queue concurrency — always 1 (D-15-15). */
export const FALLBACK_CONCURRENCY = 1;
