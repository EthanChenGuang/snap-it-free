'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import {
  clearCachedDraftPhotos,
  getCachedDraftPhotos,
  setCachedDraftPhotos,
} from '@/lib/post-draft/photo-cache';
import {
  clearPostDraft,
  dataUrlsToPhotoFiles,
  mergePostDraft,
  photoFilesToDataUrls,
  readPostDraft,
  type PostDraftCondition,
} from '@/lib/post-draft/storage';
import { useMessages } from '@/lib/i18n/useMessages';
import {
  getSubitoCategoryLabel,
  SUBITO_CATEGORY_SLUGS,
} from '@/lib/listings/subito-categories';
import { isWithinUgcVeniceBounds } from '@/lib/ugc/schemas';
import { cn } from '@/lib/utils';

type ItemCondition = PostDraftCondition;
type MediaView = 'carousel' | 'grid';

type PhotoItem = {
  id: string;
  file: File;
  preview: string;
};

const CONDITIONS: ItemCondition[] = ['brand_new', 'like_new', 'good', 'fair', 'poor'];
const MAX_PHOTOS = 10;
const DEFAULT_CATEGORY: SubitoRegaloSlug = 'arredamento-casalinghi';

function conditionLabel(
  condition: ItemCondition,
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  return messages.post.conditions[condition];
}

function postCategoryLabel(
  slug: SubitoRegaloSlug,
  language: ReturnType<typeof useMessages>['language'],
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  if (slug === 'usato') return messages.post.categoryOther;
  return getSubitoCategoryLabel(slug, language, { messages }) ?? slug;
}

function buildDescription(
  userText: string,
  categorySlug: SubitoRegaloSlug,
  condition: ItemCondition,
  messages: ReturnType<typeof useMessages>['messages'],
  language: ReturnType<typeof useMessages>['language'],
): string | undefined {
  const categoryLabel = postCategoryLabel(categorySlug, language, messages);
  const meta = [
    `${messages.post.categoryMeta}: ${categoryLabel}`,
    `${messages.post.conditionMeta}: ${conditionLabel(condition, messages)}`,
  ].join('\n');

  const trimmed = userText.trim();
  if (!trimmed) return meta;
  return `${meta}\n\n${trimmed}`;
}

function createPhotoItem(file: File): PhotoItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    preview: URL.createObjectURL(file),
  };
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhotoPlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="14" height="13" rx="3" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="7.5" cy="10.5" r="1.25" fill="currentColor" />
      <path
        d="M5.5 16l3-3a1.4 1.4 0 0 1 2 0L14 16.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18.5 3v6.5M15.25 6.25h6.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}

function PhotoTile({
  photo,
  index,
  total,
  variant,
  photoLabel,
  removeLabel,
  onRemove,
}: {
  photo: PhotoItem;
  index: number;
  total: number;
  variant: MediaView;
  photoLabel: string;
  removeLabel: string;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-2xl bg-surface-container shadow-sm transition-all duration-200',
        variant === 'carousel'
          ? 'h-64 w-64 shrink-0 snap-center'
          : 'aspect-square w-full',
      )}
    >
      <Image
        src={photo.preview}
        alt={`${photoLabel} ${index + 1}`}
        fill
        className="object-contain p-1"
        unoptimized
      />
      <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
        {index + 1}/{total}
      </span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={() => onRemove(photo.id)}
        className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md transition-all hover:bg-black/60 active:scale-90"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddPhotoTile({
  inputId,
  variant,
  empty,
  uploadHint,
  addMoreLabel,
}: {
  inputId: string;
  variant: MediaView;
  empty: boolean;
  uploadHint: string;
  addMoreLabel: string;
}) {
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low/60 text-on-surface-variant transition-colors duration-200 hover:bg-surface-container/80 active:scale-[0.98]',
        variant === 'carousel'
          ? 'h-64 w-64 shrink-0 snap-center'
          : 'aspect-square w-full',
      )}
    >
      <PhotoPlusIcon className="h-6 w-6 opacity-70" />
      <span className="px-2 text-center text-xs font-medium leading-tight">
        {empty ? uploadHint : addMoreLabel}
      </span>
    </label>
  );
}

export function PostForm() {
  const { messages, language } = useMessages();
  const addPhotosInputId = useId();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const router = useRouter();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState<SubitoRegaloSlug | null>(DEFAULT_CATEGORY);
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [lat, setLat] = useState(ZONE_CENTERS.centro_storico.lat);
  const [lng, setLng] = useState(ZONE_CENTERS.centro_storico.lng);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [cityLabel, setCityLabel] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [mediaView, setMediaView] = useState<MediaView>('carousel');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryPhotoFile = photos[0]?.file ?? null;
  const photosRef = useRef<PhotoItem[]>([]);
  photosRef.current = photos;
  const photoWriteToken = useRef(0);

  useEffect(() => {
    if (!getSupabaseEnv()) {
      setIsLoggedIn(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setIsLoggedIn(Boolean(user));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const draft = readPostDraft();

    if (draft) {
      if (draft.title != null) setTitle(draft.title);
      if (draft.description != null) setDescription(draft.description);
      if (draft.categorySlug) setCategorySlug(draft.categorySlug);
      if (draft.condition) setCondition(draft.condition);
      if (draft.lat != null && draft.lng != null) {
        setLat(draft.lat);
        setLng(draft.lng);
      }
      setLocationConfirmed(draft.locationConfirmed);
      setCityLabel(draft.label ?? '');
    }

    // Returning from the location picker keeps the module cache, so the original
    // Files restore synchronously with no re-encode and no async gap.
    const cachedFiles = getCachedDraftPhotos();
    if (cachedFiles.length > 0) {
      setPhotos(cachedFiles.map(createPhotoItem));
      setDraftHydrated(true);
      return;
    }

    const urls = draft?.photoDataUrls ?? [];
    if (urls.length === 0) {
      setDraftHydrated(true);
      return;
    }

    let cancelled = false;
    void dataUrlsToPhotoFiles(urls).then((files) => {
      if (cancelled) return;
      setCachedDraftPhotos(files);
      setPhotos(files.map(createPhotoItem));
      setDraftHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, []);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  // Text fields persist without touching photoDataUrls; mergePostDraft preserves the
  // stored photos so a keystroke can never wipe them.
  useEffect(() => {
    if (!draftHydrated) return;
    mergePostDraft({
      ...(title.trim() ? { title } : {}),
      ...(description.trim() ? { description } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      condition,
      lat,
      lng,
      label: cityLabel || undefined,
      locationConfirmed,
    });
  }, [
    draftHydrated,
    title,
    description,
    categorySlug,
    condition,
    lat,
    lng,
    cityLabel,
    locationConfirmed,
  ]);

  const commitPhotos = useCallback((next: PhotoItem[]) => {
    setPhotos(next);

    const files = next.map((photo) => photo.file);
    setCachedDraftPhotos(files);

    const token = ++photoWriteToken.current;
    void (async () => {
      const photoDataUrls = files.length > 0 ? await photoFilesToDataUrls(files) : [];
      if (token !== photoWriteToken.current) return;
      mergePostDraft({ photoDataUrls });
    })();
  }, []);

  const addPhotoFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (incoming.length === 0) return;

    const current = photosRef.current;
    const remaining = MAX_PHOTOS - current.length;
    if (remaining <= 0) return;

    commitPhotos([...current, ...incoming.slice(0, remaining).map(createPhotoItem)]);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addPhotoFiles(event.target.files);
    event.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    const removed = photosRef.current.find((photo) => photo.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    commitPhotos(photosRef.current.filter((photo) => photo.id !== id));
  };

  const handleOpenLocationPicker = () => {
    router.push('/select-location?context=post');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }

    if (!primaryPhotoFile || !title.trim()) {
      setError(messages.post.missingFields);
      return;
    }

    if (!categorySlug) {
      setError(messages.post.missingFields);
      return;
    }

    if (!locationConfirmed) {
      setError(messages.post.locationRequiredError);
      return;
    }

    if (!isWithinUgcVeniceBounds(lat, lng)) {
      setError(messages.post.pinOutsideVenice);
      return;
    }

    setSubmitting(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('photo', primaryPhotoFile);

      const uploadRes = await fetch('/api/ugc/upload', {
        method: 'POST',
        body: uploadForm,
      });

      if (uploadRes.status === 401) {
        setAuthOpen(true);
        return;
      }

      if (!uploadRes.ok) {
        throw new Error(messages.post.uploadError);
      }

      const { photoUrl } = (await uploadRes.json()) as { photoUrl: string };

      const createRes = await fetch('/api/ugc/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          photoUrl,
          lat,
          lng,
          postCategory: categorySlug,
          description: buildDescription(description, categorySlug, condition, messages, language),
        }),
      });

      if (createRes.status === 401) {
        setAuthOpen(true);
        return;
      }

      if (createRes.status === 422 || createRes.status === 400) {
        setError(messages.post.pinOutsideVenice);
        return;
      }

      if (createRes.status === 429) {
        toast(messages.post.rateLimitPost);
        return;
      }

      if (!createRes.ok) {
        throw new Error(messages.post.createError);
      }

      const { id } = (await createRes.json()) as { id: string };
      clearPostDraft();
      clearCachedDraftPhotos();
      toast(messages.post.successToast);
      router.push(`/listing/${id}`);
    } catch {
      setError(messages.post.createError);
    } finally {
      setSubmitting(false);
    }
  };

  const categoryChipSelected =
    'border-primary bg-primary text-on-primary shadow-sm scale-[1.02]';
  const categoryChipUnselected =
    'border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container';

  const conditionChipSelected = 'border-primary bg-primary text-on-primary shadow-sm';
  const conditionChipUnselected =
    'border-transparent bg-surface-container/80 text-on-surface-variant hover:bg-surface-container-high/60';

  const sectionHeaderClass =
    'text-label-sm font-semibold uppercase tracking-wide text-outline';

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <>
      <form id="post-item-form" onSubmit={handleSubmit} className="flex flex-col gap-6 pb-36">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={sectionHeaderClass}>{messages.post.photoLabel}</span>
            <div
              className="flex rounded-lg bg-surface-container p-0.5"
              role="group"
              aria-label={messages.post.photoLabel}
            >
              <button
                type="button"
                aria-label={messages.post.mediaViewCarousel}
                aria-pressed={mediaView === 'carousel'}
                onClick={() => setMediaView('carousel')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-all',
                  mediaView === 'carousel'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-[20px]">view_carousel</span>
              </button>
              <button
                type="button"
                aria-label={messages.post.mediaViewGrid}
                aria-pressed={mediaView === 'grid'}
                onClick={() => setMediaView('grid')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-all',
                  mediaView === 'grid'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </button>
            </div>
          </div>

          <div
            className={cn(
              'py-2 transition-all duration-200',
              mediaView === 'carousel'
                ? 'no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto'
                : 'grid grid-cols-3 gap-2.5',
            )}
          >
            {photos.map((photo, index) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                index={index}
                total={photos.length}
                variant={mediaView}
                photoLabel={messages.post.photoLabel}
                removeLabel={messages.post.removePhoto}
                onRemove={handleRemovePhoto}
              />
            ))}

            {canAddMore && (
              <AddPhotoTile
                inputId={addPhotosInputId}
                variant={mediaView}
                empty={photos.length === 0}
                uploadHint={messages.post.uploadHint}
                addMoreLabel={messages.post.addMorePhotos}
              />
            )}
          </div>

          <input
            id={addPhotosInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handlePhotoChange}
          />

          {photos.length === 0 && (
            <p className="text-label-sm text-on-surface-variant">{messages.post.uploadFormatHint}</p>
          )}
        </section>

        <section className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/60 p-4 transition-all focus-within:border-primary focus-within:bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary/10">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={messages.post.titlePlaceholder}
            className="w-full border-0 bg-transparent text-base font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-outline-variant"
          />
          <div className="my-3 h-px bg-outline-variant/40" />
          <textarea
            ref={descriptionRef}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={messages.post.descriptionPlaceholder}
            rows={1}
            className="w-full resize-none overflow-hidden border-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline-variant"
          />
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('block', sectionHeaderClass)}>
                {messages.post.categoryLabel}
              </span>
              {categorySlug && (
                <button
                  type="button"
                  onClick={() => setCategorySlug(null)}
                  className="text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
                >
                  {messages.feed.clearSelection}
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              {SUBITO_CATEGORY_SLUGS.map((slug) => {
                const isSelected = categorySlug === slug;
                const label = postCategoryLabel(slug, language, messages);
                return (
                  <button
                    key={slug}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCategorySlug(slug)}
                    className={cn(
                      'flex min-h-11 items-center justify-center break-words rounded-xl border px-3 py-2.5 text-center text-xs font-medium leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline',
                      isSelected ? categoryChipSelected : categoryChipUnselected,
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className={cn('block', sectionHeaderClass)}>
              {messages.post.conditionLabel}
            </span>
            <div className="mt-2 grid w-full grid-cols-5 gap-1.5">
              {CONDITIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={condition === value}
                  onClick={() => setCondition(value)}
                  className={cn(
                    'rounded-full border px-1 py-2 text-center text-xs font-medium leading-tight transition-all',
                    condition === value ? conditionChipSelected : conditionChipUnselected,
                  )}
                >
                  {conditionLabel(value, messages)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenLocationPicker}
            className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/50 bg-surface-container/70 p-4 transition-all duration-150 hover:bg-surface-container-high/60 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
              <p className="text-sm font-medium text-on-surface">
                {locationConfirmed ? cityLabel : messages.post.locationRowPending}
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        </section>

        {error && <p className="text-label-sm text-error">{error}</p>}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/30 bg-surface-container-lowest/80 p-4 pb-8 backdrop-blur-md">
        <button
          type="submit"
          form="post-item-form"
          disabled={submitting}
          className="w-full rounded-full bg-primary py-4 text-sm font-semibold text-on-primary shadow-md transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? messages.post.submitting : messages.post.submit}
        </button>
        <p className="mt-3 text-center text-label-sm text-on-surface-variant">
          {messages.post.guidelines}
        </p>
      </div>

      <AuthPromptModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
