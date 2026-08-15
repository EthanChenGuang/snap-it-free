/**
 * Vinted free-item price gate (D-17-01/02/04).
 *
 * Only listings whose price.amount parses to exactly 0 qualify as free.
 * Missing, empty, and non-zero amounts never qualify — there is no
 * keyword/regalo-title fallback (D-17-02).
 */

export function isFreePrice(amount: string | number | null | undefined): boolean {
  if (amount == null || amount === '') return false;
  if (typeof amount === 'number') return amount === 0;
  const trimmed = String(amount).trim();
  // Strict numeric gate (D-17-02): reject any string with non-numeric characters
  // (e.g. "0 €" would otherwise silently parseFloat to 0).
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  return Number.parseFloat(trimmed) === 0;
}

export type RejectReason = 'not_free';

/**
 * Returns `not_free` when a listing should be rejected at extract because its
 * price is not exactly €0 (or is missing/ambiguous). Otherwise null.
 */
export function rejectReasonIfNotFree(
  amount: string | number | null | undefined,
): RejectReason | null {
  return isFreePrice(amount) ? null : 'not_free';
}

export {
  isLocalPickup,
  matchesCityIntent,
  parseCityIntentFromUrl,
} from './enrich.js';
