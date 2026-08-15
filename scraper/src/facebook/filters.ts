/**
 * Facebook free-item price gate (D-18-01/02/03).
 *
 * Accepts structured zero and localized free tokens from the price field only.
 * Missing or ambiguous prices return price_ambiguous — no title-keyword fallback.
 */

const FREE_FORMATTED = new Set(['free', 'gratis', 'gratuito']);

function isNumericZero(amount: string | number): boolean {
  if (typeof amount === 'number') return amount === 0;
  const trimmed = String(amount).trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  return Number.parseFloat(trimmed) === 0;
}

export function isFacebookFreePrice(
  amount: string | number | null | undefined,
  formatted?: string | null,
): boolean {
  if (amount != null && amount !== '' && isNumericZero(amount)) return true;
  if (formatted) {
    const norm = formatted.trim().toLowerCase().replace(/\s+/g, ' ');
    if (FREE_FORMATTED.has(norm)) return true;
    if (/^0([.,]00)?(\s*[€$])?$/.test(norm)) return true;
  }
  return false;
}

export type FacebookPriceReject = 'not_free' | 'price_ambiguous';

export function rejectReasonIfNotFacebookFree(
  amount: string | number | null | undefined,
  formatted?: string | null,
): FacebookPriceReject | null {
  if ((amount == null || amount === '') && !formatted) return 'price_ambiguous';

  const ambiguous = [formatted, amount != null ? String(amount) : '']
    .filter(Boolean)
    .some((v) => /negotiable|contact|da concordare|trattabile/i.test(String(v)));
  if (ambiguous) return 'price_ambiguous';

  return isFacebookFreePrice(amount, formatted) ? null : 'not_free';
}
