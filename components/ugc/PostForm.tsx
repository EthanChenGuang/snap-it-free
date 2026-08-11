'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import {
  clearPostDraft,
  dataUrlToPhotoFile,
  mergePostDraft,
  photoFileToDataUrl,
  readPostDraft,
  type PostDraftCondition,
} from '@/lib/post-draft/storage';
import { useMessages } from '@/lib/i18n/useMessages';
import { POST_CATEGORIES, type PostCategory } from '@/lib/listings/canonical-categories';
import { isWithinUgcVeniceBounds } from '@/lib/ugc/schemas';

type ItemCondition = PostDraftCondition;

type PhotoItem = {
  id: string;
  file: File;
  preview: string;
};

const CONDITIONS: ItemCondition[] = ['new', 'good', 'fair'];
const MAX_PHOTOS = 10;

function postCategoryLabel(
  category: PostCategory,
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  return messages.post.categories[category];
}

function conditionLabel(
  condition: ItemCondition,
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  return messages.post.conditions[condition];
}

function buildDescription(
  userText: string,
  category: PostCategory,
  condition: ItemCondition,
  messages: ReturnType<typeof useMessages>['messages'],
): string | undefined {
  const meta = [
    `${messages.post.categoryMeta}: ${postCategoryLabel(category, messages)}`,
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

export function PostForm() {
  const { messages } = useMessages();
  const addPhotosInputId = useId();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const router = useRouter();
  const [draftReady, setDraftReady] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('furniture');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [lat, setLat] = useState(ZONE_CENTERS.centro_storico.lat);
  const [lng, setLng] = useState(ZONE_CENTERS.centro_storico.lng);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [cityLabel, setCityLabel] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryPhotoFile = photos[0]?.file ?? null;

  useEffect(() => {
    if (!getSupabaseEnv()) {
      setIsLoggedIn(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

  useEffect(() => {
    const draft = readPostDraft();
    if (draft) {
      if (draft.title != null) setTitle(draft.title);
      if (draft.description != null) setDescription(draft.description);
      if (draft.category) setCategory(draft.category);
      if (draft.condition) setCondition(draft.condition);
      if (draft.lat != null && draft.lng != null) {
        setLat(draft.lat);
        setLng(draft.lng);
      }
      setLocationConfirmed(draft.locationConfirmed);
      setCityLabel(draft.label ?? '');

      if (draft.photoDataUrl) {
        void dataUrlToPhotoFile(draft.photoDataUrl).then((file) => {
          if (file) setPhotos([createPhotoItem(file)]);
        });
      }
    }

    setDraftReady(true);
  }, []);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, [photos]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  const persistFormDraft = useCallback(
    async (overrides?: {
      title?: string;
      description?: string;
      category?: PostCategory;
      condition?: ItemCondition;
      photoFile?: File | null;
      lat?: number;
      lng?: number;
      cityLabel?: string;
      locationConfirmed?: boolean;
    }) => {
      if (!draftReady) return;

      const nextTitle = overrides?.title ?? title;
      const nextDescription = overrides?.description ?? description;
      const nextCategory = overrides?.category ?? category;
      const nextCondition = overrides?.condition ?? condition;
      const nextLat = overrides?.lat ?? lat;
      const nextLng = overrides?.lng ?? lng;
      const nextCityLabel = overrides?.cityLabel ?? cityLabel;
      const nextLocationConfirmed = overrides?.locationConfirmed ?? locationConfirmed;
      const nextPhotoFile =
        overrides?.photoFile !== undefined ? overrides.photoFile : primaryPhotoFile;

      let photoDataUrl: string | undefined;
      if (nextPhotoFile) {
        const encoded = await photoFileToDataUrl(nextPhotoFile);
        if (encoded) photoDataUrl = encoded;
      }

      mergePostDraft({
        ...(nextTitle.trim() ? { title: nextTitle } : {}),
        ...(nextDescription.trim() ? { description: nextDescription } : {}),
        category: nextCategory,
        condition: nextCondition,
        lat: nextLat,
        lng: nextLng,
        label: nextCityLabel || undefined,
        locationConfirmed: nextLocationConfirmed,
        ...(photoDataUrl ? { photoDataUrl } : {}),
      });
    },
    [
      title,
      description,
      category,
      condition,
      lat,
      lng,
      cityLabel,
      locationConfirmed,
      primaryPhotoFile,
      draftReady,
    ],
  );

  useEffect(() => {
    void persistFormDraft();
  }, [
    title,
    description,
    category,
    condition,
    lat,
    lng,
    cityLabel,
    locationConfirmed,
    primaryPhotoFile,
    persistFormDraft,
  ]);

  const addPhotoFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (incoming.length === 0) return;

    setPhotos((current) => {
      const remaining = MAX_PHOTOS - current.length;
      if (remaining <= 0) return current;
      const nextItems = incoming.slice(0, remaining).map(createPhotoItem);
      return [...current, ...nextItems];
    });
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addPhotoFiles(event.target.files);
    event.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((photo) => photo.id !== id);
    });
  };

  const handleOpenLocationPicker = () => {
    void persistFormDraft();
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
          postCategory: category,
          description: buildDescription(description, category, condition, messages),
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
      toast(messages.post.successToast);
      router.push(`/listing/${id}`);
    } catch {
      setError(messages.post.createError);
    } finally {
      setSubmitting(false);
    }
  };

  const chipBase =
    'rounded-xl py-2.5 text-xs font-medium text-center border transition-all duration-150';
  const chipSelected = 'scale-[1.02] border-primary bg-primary text-on-primary shadow-sm';
  const chipUnselected =
    'border-transparent bg-surface-container/80 text-on-surface-variant hover:bg-surface-container-high/60';

  return (
    <>
      <form id="post-item-form" onSubmit={handleSubmit} className="flex flex-col gap-6 pb-36">
        <section className="space-y-2">
          <label className="block text-label-md text-on-surface-variant">
            {messages.post.photoLabel}
          </label>

          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto py-2">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative flex h-72 w-72 shrink-0 snap-center items-center justify-center overflow-hidden rounded-2xl bg-surface-container shadow-sm"
              >
                <Image
                  src={photo.preview}
                  alt={`${messages.post.photoLabel} ${index + 1}`}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
                <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {index + 1}/{photos.length}
                </span>
                <button
                  type="button"
                  aria-label={messages.post.removePhoto}
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute right-2 top-9 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-transform duration-150 hover:bg-black active:scale-95"
                >
                  <span className="material-symbols-outlined text-base leading-none">close</span>
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <label
                htmlFor={addPhotosInputId}
                className="flex h-72 w-72 shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant bg-surface-container/80 text-on-surface-variant transition-all duration-150 hover:bg-surface-container-high/60 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                <span className="px-4 text-center text-xs font-medium">
                  {photos.length === 0 ? messages.post.uploadHint : messages.post.addMorePhotos}
                </span>
              </label>
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

        <section className="rounded-2xl border border-outline-variant/50 bg-surface-container/70 p-4 transition-all focus-within:border-primary focus-within:bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary">
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
            <span className="block text-label-md text-on-surface-variant">
              {messages.post.categoryLabel}
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {POST_CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`${chipBase} ${category === value ? chipSelected : chipUnselected}`}
                >
                  {postCategoryLabel(value, messages)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-label-md text-on-surface-variant">
              {messages.post.conditionLabel}
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CONDITIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCondition(value)}
                  className={`${chipBase} ${condition === value ? chipSelected : chipUnselected}`}
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
