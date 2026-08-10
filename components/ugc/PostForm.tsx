'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import { readPostDraft } from '@/lib/post-draft/storage';
import { useMessages } from '@/lib/i18n/useMessages';
import { POST_CATEGORIES, type PostCategory } from '@/lib/listings/canonical-categories';

type ItemCondition = 'new' | 'good' | 'fair';

const CONDITIONS: ItemCondition[] = ['new', 'good', 'fair'];

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

export function PostForm() {
  const { messages } = useMessages();

  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('furniture');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [lat, setLat] = useState(ZONE_CENTERS.centro_storico.lat);
  const [lng, setLng] = useState(ZONE_CENTERS.centro_storico.lng);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [cityLabel, setCityLabel] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

  useEffect(() => {
    const draft = readPostDraft();
    if (draft) {
      setLat(draft.lat);
      setLng(draft.lng);
      setLocationConfirmed(draft.locationConfirmed);
      setCityLabel(draft.label ?? '');
    }
  }, []);

  const applyPhotoFile = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) applyPhotoFile(file);
  };

  const handlePhotoDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) applyPhotoFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }

    if (!photoFile || !title.trim()) {
      setError(messages.post.missingFields);
      return;
    }

    if (!locationConfirmed) {
      setError(messages.post.locationRequiredError);
      return;
    }

    setSubmitting(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('photo', photoFile);

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

      if (createRes.status === 422) {
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
      toast(messages.post.successToast);
      router.push(`/listing/${id}`);
    } catch {
      setError(messages.post.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-xl">
        <section className="space-y-space-md">
          <label className="block text-label-md text-on-surface-variant">
            {messages.post.photoLabel}
          </label>
          <div className="group relative cursor-pointer">
            <div
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-space-sm rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-container"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3crect width=\'100%25\' height=\'100%25\' fill=\'none\' stroke=\'%23C4C7C7\' stroke-width=\'2\' stroke-dasharray=\'8%2c 8\'/%3e%3c/svg%3e")',
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.currentTarget.classList.add('bg-surface-container');
              }}
              onDragLeave={(event) => {
                event.currentTarget.classList.remove('bg-surface-container');
              }}
              onDrop={handlePhotoDrop}
            >
              {photoPreview ? (
                <div className="relative h-full w-full">
                  <Image
                    src={photoPreview}
                    alt={messages.post.photoLabel}
                    fill
                    className="rounded-lg object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-outline">add_a_photo</span>
                  <span className="text-label-md text-outline">{messages.post.uploadHint}</span>
                  <span className="text-label-sm text-on-surface-variant">
                    {messages.post.uploadFormatHint}
                  </span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handlePhotoChange}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-space-lg">
          <div className="space-y-space-xs">
            <label className="block text-label-md text-on-surface-variant">
              {messages.post.titleLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={messages.post.titlePlaceholder}
              className="w-full border-0 border-b border-transparent bg-transparent px-0 py-space-xs text-h3 font-semibold text-on-surface outline-none transition-colors placeholder:text-outline-variant focus:border-outline-variant"
            />
          </div>

          <div className="space-y-space-xs">
            <label className="block text-label-md text-on-surface-variant">
              {messages.post.descriptionLabel}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={messages.post.descriptionPlaceholder}
              rows={4}
              className="w-full resize-none border-0 border-b border-transparent bg-transparent px-0 py-space-xs text-body-lg text-on-surface outline-none transition-colors placeholder:text-outline-variant focus:border-outline-variant"
            />
          </div>

          <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
            <div className="space-y-space-xs">
              <label className="block text-label-md text-on-surface-variant">
                {messages.post.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as PostCategory)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {POST_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {postCategoryLabel(value, messages)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-space-xs">
              <span className="block text-label-md text-on-surface-variant">
                {messages.post.conditionLabel}
              </span>
              <div className="flex flex-wrap gap-space-sm">
                {CONDITIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCondition(value)}
                    className={`rounded-full border px-space-md py-space-xs text-label-md transition-colors ${
                      condition === value
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {conditionLabel(value, messages)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/select-location?context=post')}
            className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-space-md"
          >
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
              <p className="text-label-md font-normal text-on-surface">
                {locationConfirmed ? cityLabel : messages.post.locationRowPending}
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        </section>

        {error && <p className="text-label-sm text-error">{error}</p>}

        <section className="pt-space-lg">
          <Button
            type="submit"
            className="w-full py-space-md text-label-md font-bold uppercase tracking-wider"
            disabled={submitting}
          >
            {submitting ? messages.post.submitting : messages.post.submit}
          </Button>
          <p className="mt-space-md text-center text-label-sm text-secondary">
            {messages.post.guidelines}
          </p>
        </section>
      </form>

      <AuthPromptModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
