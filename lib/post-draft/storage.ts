export type PostDraft = {
  lat: number;
  lng: number;
  label?: string;
  locationConfirmed: boolean;
};

export const POST_DRAFT_STORAGE_KEY = 'shoumanwu_post_draft';

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function parsePostDraft(raw: string | null): PostDraft | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PostDraft>;
    if (!isValidCoordinate(parsed.lat, -90, 90) || !isValidCoordinate(parsed.lng, -180, 180)) {
      return null;
    }
    const label =
      typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : undefined;
    const locationConfirmed = parsed.locationConfirmed === true;
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      ...(label ? { label } : {}),
      locationConfirmed,
    };
  } catch {
    return null;
  }
}

export function readPostDraft(): PostDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(POST_DRAFT_STORAGE_KEY);
  return parsePostDraft(raw);
}

export function writePostDraft(draft: {
  lat: number;
  lng: number;
  label?: string;
}): PostDraft {
  if (typeof window === 'undefined') return draft as PostDraft;
  const persisted: PostDraft = {
    lat: draft.lat,
    lng: draft.lng,
    ...(draft.label ? { label: draft.label } : {}),
    locationConfirmed: true,
  };
  sessionStorage.setItem(POST_DRAFT_STORAGE_KEY, JSON.stringify(persisted));
  return persisted;
}
