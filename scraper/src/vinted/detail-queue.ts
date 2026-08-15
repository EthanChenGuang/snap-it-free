import { detailBudgetCap } from '../subito/fallback-queue.js';
import type { VintedCatalogListing } from './http-extract.js';

/** Every free Vinted listing needs detail enrichment (shipping, geo, posted_at). */
export function shouldVisitVintedDetail(_entry: VintedCatalogListing): boolean {
  return true;
}

export { detailBudgetCap };

export function selectVintedDetailCandidates(
  workQueue: VintedCatalogListing[],
  budget: number,
): { selected: VintedCatalogListing[]; deferred: VintedCatalogListing[] } {
  const candidates = workQueue.filter(shouldVisitVintedDetail);
  const selected: VintedCatalogListing[] = [];
  const deferred: VintedCatalogListing[] = [];

  for (const entry of candidates) {
    if (selected.length < budget) {
      selected.push(entry);
    } else {
      deferred.push(entry);
    }
  }

  return { selected, deferred };
}
