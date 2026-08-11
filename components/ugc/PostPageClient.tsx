'use client';

import { PostForm } from '@/components/ugc/PostForm';
import { useMessages } from '@/lib/i18n/useMessages';

export function PostPageClient() {
  const { messages } = useMessages();

  return (
    <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-lg pb-4">
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="text-h2 font-semibold text-primary">{messages.post.title}</h1>
          <p className="text-body-md text-on-surface-variant">{messages.post.subtitle}</p>
        </section>

        <PostForm />
      </div>
    </main>
  );
}
