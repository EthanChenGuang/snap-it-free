'use client';

import { PostForm } from '@/components/ugc/PostForm';
import { messages } from '@/messages/it';

export function PostPageClient() {
  return (
    <main className="mx-auto flex h-full max-w-[800px] flex-col px-gutter py-space-xl pb-28">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <p className="text-label-sm text-on-surface-variant">{messages.nav.post}</p>
        <h1 className="text-h2 font-bold text-on-surface">{messages.post.title}</h1>
        <p className="mt-space-xs text-body-md text-secondary">{messages.post.subtitle}</p>
      </div>

      <PostForm />
    </main>
  );
}
