import type { ListingRow } from './types';

/**
 * Feed ranking boost for items that look valuable, and pets (Guang, 2026-11-09: "put valuable-looking items
 * and pets first"). Option 1 of two: free keyword rules on the Italian title. Subito categories are too loose
 * to rely on ("appliances" holds TV brackets, "furniture" holds jars), so the title decides, except for pets.
 * A later option scores items with the translation model instead.
 */

/** Titles naming objects people want (Italian, as listed). */
const APPEALING_TITLE =
  /\b(divan\w*|poltron\w*|sedi[ae]\w*|tavol\w*|scrivani\w*|lett[oi]|armadi\w*|librer\w*|lampad\w*|comodin\w*|credenz\w*|cassettier\w*|vetrin\w*|specchi\w*|sofa|bici\w*|biciclett\w*|monopattin\w*|computer|pc|notebook|laptop|macbook|monitor|ipad|iphone|smartphone|tablet|playstation|xbox|nintendo|lavatric\w*|frigorifer\w*|lavastovigli\w*|microonde|aspirapolvere|forno|caff[eè]\w*|chitarr\w*|pianofort\w*|tastier\w*|passeggin\w*|culla|seggiolon\w*)\b/i;

/** Parts, accessories and broken things stay unboosted even if the title also names something nice. */
const NOT_APPEALING =
  /\b(prenotat\w*|materass\w*|dogh\w*|senza|support\w*|staff\w*|cav[oi]|caricabatteri\w*|ricamb\w*|pezz[io]|scatol\w*|barattol\w*|rott\w*|guast\w*|difett\w*|non funzion\w*)\b/i;

export type AppealKind = 'object' | 'pet' | 'other';

type AppealFields = Pick<ListingRow, 'title' | 'category' | 'photo_url' | 'status' | 'appeal_score'>;

/**
 * With an AI score (migration 045, lib/listings/appeal-score.ts) the score decides: pets from 3, objects from 4.
 * Unscored listings fall back to the keyword rules below.
 */
export function appealKind(listing: AppealFields): AppealKind {
  if (!listing.photo_url || listing.status === 'claimed') return 'other';
  const score = listing.appeal_score;
  if (typeof score === 'number') {
    if (listing.category === 'animali') return score >= 3 ? 'pet' : 'other';
    return score >= 4 ? 'object' : 'other';
  }
  if (listing.category === 'animali') return 'pet';
  const title = listing.title ?? '';
  return APPEALING_TITLE.test(title) && !NOT_APPEALING.test(title) ? 'object' : 'other';
}

export function isAppealing(listing: AppealFields): boolean {
  return appealKind(listing) !== 'other';
}

/** Items stay in blocks of this age span, newest block first, so freshness never slips by more than this. */
export const APPEAL_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Rhythm inside a block: two valuable objects, a pet, an ordinary item, repeated. */
const RHYTHM: readonly AppealKind[] = ['object', 'object', 'pet', 'other'];

/**
 * Lead with valuable-looking items and pets without burying new ones. The incoming order (newest first)
 * is cut into 12-hour blocks; inside each block items follow the rhythm above, each kind keeping its own
 * newest-first order, and a kind that runs out is skipped. Pets and furniture arrive in bursts, so a plain
 * time boost let one kind flood the top; the rhythm keeps the mix steady.
 */
export function rankByAppeal<T extends AppealFields & Pick<ListingRow, 'posted_at'>>(
  listings: readonly T[],
): T[] {
  const out: T[] = [];
  let start = 0;
  while (start < listings.length) {
    const blockStartMs = new Date(listings[start].posted_at).getTime();
    let end = start + 1;
    while (end < listings.length && blockStartMs - new Date(listings[end].posted_at).getTime() < APPEAL_WINDOW_MS) end += 1;
    out.push(...interleave(listings.slice(start, end)));
    start = end;
  }
  return out;
}

function interleave<T extends AppealFields>(block: T[]): T[] {
  const queues: Record<AppealKind, T[]> = { object: [], pet: [], other: [] };
  for (const listing of block) queues[appealKind(listing)].push(listing);
  const out: T[] = [];
  while (out.length < block.length) {
    for (const kind of RHYTHM) {
      const next = queues[kind].shift();
      if (next) out.push(next);
    }
  }
  return out;
}
