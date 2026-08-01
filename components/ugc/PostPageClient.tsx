'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PostForm } from '@/components/ugc/PostForm';
import { StreetDumpForm } from '@/components/ugc/StreetDumpForm';
import { createClient } from '@/lib/supabase/client';
import { messages } from '@/messages/it';

type PostTab = 'publish' | 'street-dump';

export function PostPageClient() {
  const [tab, setTab] = useState<PostTab>('publish');
  const [title, setTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

  const handlePhotoChange = (file: File | null, preview: string | null) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
  };

  return (
    <main className="mx-auto flex h-full max-w-[800px] flex-col px-gutter py-space-xl pb-28">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <div className="flex items-start justify-between gap-space-md">
          <div>
            <p className="text-label-sm text-on-surface-variant">{messages.nav.post}</p>
            <h1 className="text-h2 font-bold text-on-surface">{messages.post.title}</h1>
            <p className="mt-space-xs text-body-md text-secondary">{messages.post.subtitle}</p>
          </div>
          {isLoggedIn && (
            <Link
              href="/post/manage"
              className="shrink-0 text-label-md font-medium text-on-surface underline-offset-2 hover:underline"
            >
              {messages.post.manageLink}
            </Link>
          )}
        </div>

        <div className="mt-space-md flex gap-space-lg border-b border-outline-variant">
          <button
            type="button"
            onClick={() => setTab('publish')}
            className={`border-b-2 pb-space-sm text-label-md transition-colors ${
              tab === 'publish'
                ? 'border-primary font-semibold text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {messages.post.tabs.publish}
          </button>
          <button
            type="button"
            onClick={() => setTab('street-dump')}
            className={`border-b-2 pb-space-sm text-label-md transition-colors ${
              tab === 'street-dump'
                ? 'border-primary font-semibold text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {messages.post.tabs.streetDump}
          </button>
        </div>
      </div>

      {tab === 'publish' ? (
        <PostForm
          title={title}
          onTitleChange={setTitle}
          photoFile={photoFile}
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
        />
      ) : (
        <StreetDumpForm
          title={title}
          onTitleChange={setTitle}
          photoFile={photoFile}
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
        />
      )}
    </main>
  );
}
