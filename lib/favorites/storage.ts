export const FAVORITES_STORAGE_KEY = 'shoumanwu_favorites';

export const FAVORITES_CHANGE_EVENT = 'shoumanwu-favorites-change';

function parseFavoriteIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function readFavoriteIds(): string[] {
  if (typeof window === 'undefined') return [];
  return parseFavoriteIds(localStorage.getItem(FAVORITES_STORAGE_KEY));
}

export function writeFavoriteIds(ids: string[]): string[] {
  if (typeof window === 'undefined') return ids;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: ids }));
  return ids;
}

export function toggleFavoriteId(id: string): string[] {
  const set = new Set(readFavoriteIds());
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  return writeFavoriteIds([...set]);
}

/** Drop IDs that Supabase/RLS no longer returns (expired or invalid). */
export function pruneFavoriteIds(validIds: string[]): string[] {
  const valid = new Set(validIds);
  const next = readFavoriteIds().filter((id) => valid.has(id));
  return writeFavoriteIds(next);
}

/** Only drop requested IDs absent from the fetch response — never wipe on empty/error fetch (G-02-8). */
export function pruneMissingFavoriteIds(requestedIds: string[], returnedIds: string[]): string[] {
  if (requestedIds.length === 0) return readFavoriteIds();
  const returned = new Set(returnedIds);
  const missing = new Set(requestedIds.filter((id) => !returned.has(id)));
  if (missing.size === 0) return readFavoriteIds();
  const next = readFavoriteIds().filter((id) => !missing.has(id));
  return writeFavoriteIds(next);
}
