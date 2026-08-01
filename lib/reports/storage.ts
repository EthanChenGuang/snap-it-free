export const REPORTS_STORAGE_KEY = 'shoumanwu_reported_listings';

export const REPORTS_CHANGE_EVENT = 'shoumanwu-reports-change';

function parseReportedIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function readReportedIds(): string[] {
  if (typeof window === 'undefined') return [];
  return parseReportedIds(localStorage.getItem(REPORTS_STORAGE_KEY));
}

export function writeReportedIds(ids: string[]): string[] {
  if (typeof window === 'undefined') return ids;
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(REPORTS_CHANGE_EVENT, { detail: ids }));
  return ids;
}

export function addReportedId(id: string): string[] {
  const set = new Set(readReportedIds());
  set.add(id);
  return writeReportedIds([...set]);
}
