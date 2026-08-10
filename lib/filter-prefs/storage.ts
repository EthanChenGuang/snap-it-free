export type FilterPrefs = {
  radiusKm: number;
  radiusEnabled: boolean;
  city: 'all' | 'venice' | 'padova';
  categories: string[];
};

export const FILTER_PREFS_STORAGE_KEY = 'shoumanwu_filter_prefs';
export const FILTER_PREFS_CHANGE_EVENT = 'shoumanwu-filter-prefs-change';

export const DEFAULT_FILTER_PREFS: FilterPrefs = {
  radiusKm: 10,
  radiusEnabled: false,
  city: 'all',
  categories: [],
};

const VALID_CITIES = new Set<FilterPrefs['city']>(['all', 'venice', 'padova']);

function clampRadiusKm(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_FILTER_PREFS.radiusKm;
  }
  return Math.min(50, Math.max(1, Math.round(value)));
}

function parseCity(value: unknown): FilterPrefs['city'] {
  if (typeof value === 'string' && VALID_CITIES.has(value as FilterPrefs['city'])) {
    return value as FilterPrefs['city'];
  }
  return 'all';
}

function parseCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function parseFilterPrefs(raw: string | null): FilterPrefs {
  if (!raw?.trim()) return DEFAULT_FILTER_PREFS;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      radiusKm: clampRadiusKm(parsed.radiusKm),
      radiusEnabled: parsed.radiusEnabled === true,
      city: parseCity(parsed.city),
      categories: parseCategories(parsed.categories),
    };
  } catch {
    return DEFAULT_FILTER_PREFS;
  }
}

let cachedRaw: string | null | undefined;
let cachedPrefs: FilterPrefs = DEFAULT_FILTER_PREFS;

function invalidateFilterPrefsCache(raw: string | null = null) {
  cachedRaw = raw;
  cachedPrefs = parseFilterPrefs(raw);
}

export function readFilterPrefs(): FilterPrefs {
  if (typeof window === 'undefined') return DEFAULT_FILTER_PREFS;
  const raw = localStorage.getItem(FILTER_PREFS_STORAGE_KEY);
  if (raw === cachedRaw) return cachedPrefs;
  invalidateFilterPrefsCache(raw);
  return cachedPrefs;
}

export function writeFilterPrefs(prefs: FilterPrefs): FilterPrefs {
  const normalized: FilterPrefs = {
    radiusKm: clampRadiusKm(prefs.radiusKm),
    radiusEnabled: prefs.radiusEnabled === true,
    city: parseCity(prefs.city),
    categories: parseCategories(prefs.categories),
  };
  if (typeof window === 'undefined') return normalized;
  const raw = JSON.stringify(normalized);
  localStorage.setItem(FILTER_PREFS_STORAGE_KEY, raw);
  invalidateFilterPrefsCache(raw);
  window.dispatchEvent(new CustomEvent(FILTER_PREFS_CHANGE_EVENT, { detail: normalized }));
  return normalized;
}

export function subscribeFilterPrefs(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    invalidateFilterPrefsCache(localStorage.getItem(FILTER_PREFS_STORAGE_KEY));
    onStoreChange();
  };
  window.addEventListener(FILTER_PREFS_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(FILTER_PREFS_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
