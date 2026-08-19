import type { SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import {
  POST_CATEGORY_TO_SLUG,
  type PostCategory,
} from '@/lib/listings/canonical-categories';
import { SUBITO_CATEGORY_SLUGS } from '@/lib/listings/subito-categories';

export type PostDraftCondition = 'brand_new' | 'like_new' | 'good' | 'fair' | 'poor';

export type PostDraft = {
  title?: string;
  description?: string;
  categorySlug?: SubitoRegaloSlug;
  condition?: PostDraftCondition;
  /** @deprecated Use photoDataUrls — kept for backward-compatible reads. */
  photoDataUrl?: string;
  photoDataUrls?: string[];
  lat?: number;
  lng?: number;
  label?: string;
  locationConfirmed: boolean;
};

export const POST_DRAFT_STORAGE_KEY = 'shoumanwu_post_draft';
export const MAX_DRAFT_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_DRAFT_PHOTOS = 10;
/** sessionStorage caps near 5 MB, so draft copies are downscaled before encoding. */
export const MAX_DRAFT_PHOTO_DIMENSION = 1280;
export const DRAFT_PHOTO_QUALITY = 0.72;

const SUBITO_SLUG_SET = new Set<string>(SUBITO_CATEGORY_SLUGS);
const LEGACY_POST_CATEGORY_SET = new Set<string>(Object.keys(POST_CATEGORY_TO_SLUG));
const CONDITION_SET = new Set<string>(['brand_new', 'like_new', 'good', 'fair', 'poor']);
const LEGACY_CONDITION_MAP: Record<string, PostDraftCondition> = {
  new: 'brand_new',
  good: 'good',
  fair: 'fair',
};

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isValidDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function normalizeCondition(value: unknown): PostDraftCondition | undefined {
  if (typeof value !== 'string') return undefined;
  if (CONDITION_SET.has(value)) return value as PostDraftCondition;
  return LEGACY_CONDITION_MAP[value];
}

function normalizeCategorySlug(value: unknown): SubitoRegaloSlug | undefined {
  if (typeof value !== 'string') return undefined;
  if (SUBITO_SLUG_SET.has(value)) return value as SubitoRegaloSlug;
  if (LEGACY_POST_CATEGORY_SET.has(value)) {
    return POST_CATEGORY_TO_SLUG[value as PostCategory];
  }
  return undefined;
}

function normalizePhotoDataUrls(parsed: Partial<PostDraft>): string[] {
  if (Array.isArray(parsed.photoDataUrls)) {
    return parsed.photoDataUrls.filter(isValidDataUrl).slice(0, MAX_DRAFT_PHOTOS);
  }
  if (isValidDataUrl(parsed.photoDataUrl)) {
    return [parsed.photoDataUrl];
  }
  return [];
}

function hasDraftContent(draft: PostDraft): boolean {
  return Boolean(
    draft.title?.trim() ||
      draft.description?.trim() ||
      draft.categorySlug ||
      draft.condition ||
      (draft.photoDataUrls?.length ?? 0) > 0 ||
      draft.locationConfirmed ||
      (draft.lat != null && draft.lng != null),
  );
}

function parsePostDraft(raw: string | null): PostDraft | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PostDraft> & { category?: string };
    const draft: PostDraft = { locationConfirmed: false };

    if (typeof parsed.title === 'string') draft.title = parsed.title;
    if (typeof parsed.description === 'string') draft.description = parsed.description;

    const categorySlug =
      normalizeCategorySlug(parsed.categorySlug) ?? normalizeCategorySlug(parsed.category);
    if (categorySlug) draft.categorySlug = categorySlug;

    const condition = normalizeCondition(parsed.condition);
    if (condition) draft.condition = condition;

    const photoDataUrls = normalizePhotoDataUrls(parsed);
    if (photoDataUrls.length > 0) draft.photoDataUrls = photoDataUrls;

    if (
      isValidCoordinate(parsed.lat, -90, 90) &&
      isValidCoordinate(parsed.lng, -180, 180)
    ) {
      draft.lat = parsed.lat;
      draft.lng = parsed.lng;
      draft.locationConfirmed = parsed.locationConfirmed === true;
      const label =
        typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label.trim() : undefined;
      if (label) draft.label = label;
    }

    return hasDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

function tryWriteDraft(draft: Omit<PostDraft, 'photoDataUrl'>): boolean {
  try {
    sessionStorage.setItem(POST_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes the draft, shedding trailing photos when the browser rejects the payload.
 * Losing a photo copy is recoverable (the in-memory cache still holds the originals),
 * but an uncaught QuotaExceededError would abort navigation to the location picker.
 */
function persistDraft(draft: PostDraft): PostDraft {
  if (typeof window === 'undefined') return draft;
  const { photoDataUrl: _legacy, ...serializable } = draft;

  if (tryWriteDraft(serializable)) return draft;

  const urls = [...(serializable.photoDataUrls ?? [])];
  while (urls.length > 0) {
    urls.pop();
    if (tryWriteDraft({ ...serializable, photoDataUrls: urls })) {
      return { ...draft, photoDataUrls: urls };
    }
  }

  tryWriteDraft({ ...serializable, photoDataUrls: [] });
  return { ...draft, photoDataUrls: [] };
}

export function readPostDraft(): PostDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(POST_DRAFT_STORAGE_KEY);
  return parsePostDraft(raw);
}

export function mergePostDraft(partial: Partial<PostDraft>): PostDraft {
  const existing = readPostDraft() ?? { locationConfirmed: false };
  const merged: PostDraft = { ...existing, locationConfirmed: existing.locationConfirmed ?? false };

  for (const [key, value] of Object.entries(partial) as [keyof PostDraft, PostDraft[keyof PostDraft]][]) {
    if (value === undefined) continue;
    if ((key === 'title' || key === 'description') && value === '') continue;
    merged[key] = value as never;
  }

  merged.locationConfirmed =
    partial.locationConfirmed ?? existing.locationConfirmed ?? false;

  if (partial.photoDataUrls !== undefined) {
    merged.photoDataUrls = partial.photoDataUrls;
  }

  return persistDraft(merged);
}

export function writePostDraft(draft: {
  lat: number;
  lng: number;
  label?: string;
}): PostDraft {
  return mergePostDraft({
    lat: draft.lat,
    lng: draft.lng,
    ...(draft.label ? { label: draft.label } : {}),
    locationConfirmed: true,
  });
}

export function clearPostDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(POST_DRAFT_STORAGE_KEY);
}

export async function photoFileToDataUrl(file: File): Promise<string | null> {
  if (file.size > MAX_DRAFT_PHOTO_BYTES) return null;
  if (!file.type.startsWith('image/')) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales to a draft-sized JPEG so a full photo set fits the sessionStorage budget.
 * Falls back to the raw encoding where canvas is unavailable (SSR, jsdom).
 */
export async function compressPhotoForDraft(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return photoFileToDataUrl(file);
  }

  try {
    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = longestEdge > 0 ? Math.min(1, MAX_DRAFT_PHOTO_DIMENSION / longestEdge) : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return photoFileToDataUrl(file);
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const encoded = canvas.toDataURL('image/jpeg', DRAFT_PHOTO_QUALITY);
    return encoded.startsWith('data:image/') ? encoded : photoFileToDataUrl(file);
  } catch {
    return photoFileToDataUrl(file);
  }
}

export async function photoFilesToDataUrls(files: File[]): Promise<string[]> {
  const encoded = await Promise.all(files.map((file) => compressPhotoForDraft(file)));
  return encoded.filter((url): url is string => url != null);
}

export async function dataUrlToPhotoFile(dataUrl: string): Promise<File | null> {
  if (!dataUrl.startsWith('data:image/')) return null;
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const extension = blob.type.split('/')[1] || 'jpg';
    return new File([blob], `draft-photo.${extension}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

export async function dataUrlsToPhotoFiles(dataUrls: string[]): Promise<File[]> {
  const files = await Promise.all(dataUrls.map((url) => dataUrlToPhotoFile(url)));
  return files.filter((file): file is File => file != null);
}
