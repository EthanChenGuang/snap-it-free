import { isConsumerCityKey, type ConsumerCityKey } from '@/lib/geo/italian-cities';

/** Legacy fallback when alerts.city column is not migrated yet. */
const ENCODED_KEYWORD = /^@city:([a-z_]+)@([\s\S]*)$/;

export function encodeAlertKeyword(
  keyword: string | null | undefined,
  city: ConsumerCityKey | null | undefined,
): string | null {
  const trimmed = keyword?.trim() ?? '';
  if (!city) {
    return trimmed.length > 0 ? trimmed : null;
  }
  return `@city:${city}@${trimmed}`;
}

export function decodeAlertKeyword(stored: string | null | undefined): {
  keyword: string | null;
  city: ConsumerCityKey | null;
} {
  if (!stored) {
    return { keyword: null, city: null };
  }

  const match = stored.match(ENCODED_KEYWORD);
  if (!match) {
    return { keyword: stored, city: null };
  }

  const city = match[1]!;
  const keyword = match[2]!.trim();
  return {
    keyword: keyword.length > 0 ? keyword : null,
    city: isConsumerCityKey(city) ? city : null,
  };
}

export function resolveAlertFields(row: {
  keyword: string | null;
  city: ConsumerCityKey | null;
}): { keyword: string | null; city: ConsumerCityKey | null } {
  if (row.city) {
    return { keyword: row.keyword, city: row.city };
  }

  const decoded = decodeAlertKeyword(row.keyword);
  if (decoded.city) {
    return decoded;
  }

  return { keyword: row.keyword, city: null };
}
