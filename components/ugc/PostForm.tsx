'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import type { VeniceZone } from '@/lib/listings/types';
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import { messages, zoneLabel } from '@/messages/it';

const PinMap = dynamic(() => import('@/components/ugc/PinMap').then((mod) => mod.PinMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded border border-outline-variant bg-surface-container-low text-label-sm text-on-surface-variant">
      {messages.post.mapLoading}
    </div>
  ),
});

const ZONES: VeniceZone[] = ['centro_storico', 'mestre_marghera', 'lido_murano'];

type PostFormProps = {
  title: string;
  onTitleChange: (value: string) => void;
  photoFile: File | null;
  photoPreview: string | null;
  onPhotoChange: (file: File | null, preview: string | null) => void;
};

export function PostForm({
  title,
  onTitleChange,
  photoFile,
  photoPreview,
  onPhotoChange,
}: PostFormProps) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [zone, setZone] = useState<VeniceZone>('centro_storico');
  const [lat, setLat] = useState(ZONE_CENTERS.centro_storico.lat);
  const [lng, setLng] = useState(ZONE_CENTERS.centro_storico.lng);
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

  const handlePinChange = useCallback((nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
  }, []);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onPhotoChange(file, URL.createObjectURL(file));
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
          description: description.trim() || undefined,
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
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-space-sm rounded border border-dashed border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-container"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3crect width=\'100%25\' height=\'100%25\' fill=\'none\' stroke=\'%23C4C7C7\' stroke-width=\'2\' stroke-dasharray=\'8%2c 8\'/%3e%3c/svg%3e")',
              }}
            >
              {photoPreview ? (
                <div className="relative h-full w-full">
                  <Image
                    src={photoPreview}
                    alt={messages.post.photoLabel}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-outline">add_a_photo</span>
                  <span className="text-label-md text-outline">{messages.post.uploadHint}</span>
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

        <section className="space-y-space-lg">
          <div className="space-y-space-xs">
            <label className="block text-label-md text-on-surface-variant">
              {messages.post.titleLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={messages.post.titlePlaceholder}
              className="w-full border-0 border-b border-transparent bg-transparent px-0 py-space-xs text-h3 font-semibold text-on-surface outline-none transition-colors placeholder:text-outline-variant focus:border-outline-variant"
            />
          </div>

          <div className="space-y-space-sm">
            <span className="block text-label-md text-on-surface-variant">{messages.post.zoneLabel}</span>
            <div className="flex flex-wrap gap-space-sm">
              {ZONES.map((z) => (
                <Button
                  key={z}
                  type="button"
                  variant={zone === z ? 'chipActive' : 'chip'}
                  size="sm"
                  onClick={() => setZone(z)}
                >
                  {zoneLabel(z)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-space-sm">
            <span className="block text-label-md text-on-surface-variant">{messages.post.pinLabel}</span>
            <PinMap zone={zone} lat={lat} lng={lng} onPinChange={handlePinChange} />
          </div>

          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="text-label-md text-secondary underline-offset-2 hover:underline"
            >
              {messages.post.addDetails}
            </button>
          ) : (
            <div className="space-y-space-xs">
              <label className="block text-label-md text-on-surface-variant">
                {messages.post.descriptionLabel}
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={messages.post.descriptionPlaceholder}
                rows={4}
                className="w-full resize-none rounded border border-outline-variant bg-surface px-space-sm py-space-sm text-body-md text-on-surface outline-none focus:border-primary"
              />
            </div>
          )}
        </section>

        {error && <p className="text-label-sm text-error">{error}</p>}

        <section className="pt-space-lg">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? messages.post.submitting : messages.post.submit}
          </Button>
          <p className="mt-space-md text-center text-label-sm text-on-surface-variant">
            {messages.post.guidelines}
          </p>
        </section>
      </form>

      <AuthPromptModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
