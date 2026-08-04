'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { nearestVeniceZone } from '@/lib/geo/nearest-zone';
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import { messages, zoneLabel } from '@/messages/it';

type PostCategory =
  | 'furniture'
  | 'tech'
  | 'books'
  | 'apparel'
  | 'kitchenware'
  | 'others';

type ItemCondition = 'new' | 'good' | 'fair';

const POST_CATEGORIES: PostCategory[] = [
  'furniture',
  'tech',
  'books',
  'apparel',
  'kitchenware',
  'others',
];

const CONDITIONS: ItemCondition[] = ['new', 'good', 'fair'];

function postCategoryLabel(category: PostCategory): string {
  return messages.post.categories[category];
}

function conditionLabel(condition: ItemCondition): string {
  return messages.post.conditions[condition];
}

function buildDescription(
  userText: string,
  category: PostCategory,
  condition: ItemCondition,
): string | undefined {
  const meta = [
    `${messages.post.categoryMeta}: ${postCategoryLabel(category)}`,
    `${messages.post.conditionMeta}: ${conditionLabel(condition)}`,
  ].join('\n');

  const trimmed = userText.trim();
  if (!trimmed) return meta;
  return `${meta}\n\n${trimmed}`;
}

export function PostForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('furniture');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [pinLocation, setPinLocation] = useState(true);
  const [lat, setLat] = useState(ZONE_CENTERS.centro_storico.lat);
  const [lng, setLng] = useState(ZONE_CENTERS.centro_storico.lng);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(messages.post.geolocationUnavailable);
      return;
    }

    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
      },
      (positionError) => {
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setGeoError(messages.post.geolocationDenied);
        } else if (positionError.code === positionError.TIMEOUT) {
          setGeoError(messages.post.geolocationTimeout);
        } else {
          setGeoError(messages.post.geolocationUnavailable);
        }
        setPinLocation(false);
        setLat(ZONE_CENTERS.centro_storico.lat);
        setLng(ZONE_CENTERS.centro_storico.lng);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (pinLocation) {
      requestGeolocation();
    } else {
      setLat(ZONE_CENTERS.centro_storico.lat);
      setLng(ZONE_CENTERS.centro_storico.lng);
      setGeoError(null);
    }
  }, [pinLocation, requestGeolocation]);

  const locationLine = useMemo(() => {
    const zone = nearestVeniceZone(lat, lng);
    return `Venezia, ${zoneLabel(zone)}`;
  }, [lat, lng]);

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
          description: buildDescription(description, category, condition),
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
                    {postCategoryLabel(value)}
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
                    {conditionLabel(value)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
              <div>
                <p className="text-label-md text-primary">{messages.post.pinCurrentLocation}</p>
                <p className="text-label-sm text-secondary">
                  {pinLocation ? locationLine : messages.post.pinLocationDefault}
                </p>
                {geoError && pinLocation && (
                  <p className="mt-space-xs text-label-sm text-error">{geoError}</p>
                )}
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={pinLocation}
                onChange={(event) => setPinLocation(event.target.checked)}
              />
              <div className="relative h-6 w-11 rounded-full bg-outline-variant after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none rtl:peer-checked:after:-translate-x-full" />
            </label>
          </div>
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
