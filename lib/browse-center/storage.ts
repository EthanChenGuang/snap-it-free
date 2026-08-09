export type BrowseCenter = {
  lat: number;
  lng: number;
  label?: string;
};

export const BROWSE_CENTER_STORAGE_KEY = 'shoumanwu_browse_center';
export const BROWSE_CENTER_CHANGE_EVENT = 'shoumanwu-browse-center-change';

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function parseBrowseCenter(raw: string | null): BrowseCenter | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BrowseCenter>;
    if (!isValidCoordinate(parsed.lat, -90, 90) || !isValidCoordinate(parsed.lng, -180, 180)) {
      return null;
    }
    const label = typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : undefined;
    return { lat: parsed.lat, lng: parsed.lng, ...(label ? { label } : {}) };
  } catch {
    return null;
  }
}

export function readBrowseCenter(): BrowseCenter | null {
  if (typeof window === 'undefined') return null;
  return parseBrowseCenter(localStorage.getItem(BROWSE_CENTER_STORAGE_KEY));
}

export function writeBrowseCenter(center: BrowseCenter): BrowseCenter {
  if (typeof window === 'undefined') return center;
  localStorage.setItem(BROWSE_CENTER_STORAGE_KEY, JSON.stringify(center));
  window.dispatchEvent(new CustomEvent(BROWSE_CENTER_CHANGE_EVENT, { detail: center }));
  return center;
}

export function subscribeBrowseCenter(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(BROWSE_CENTER_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(BROWSE_CENTER_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
