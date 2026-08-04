'use client';

import { PostForm } from '@/components/ugc/PostForm';
import { messages } from '@/messages/it';

export function PostPageClient() {
  return (
    <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-xl pb-32">
      <div className="flex flex-col gap-space-xl">
        <section className="space-y-space-xs">
          <h1 className="text-h2 font-semibold text-primary">{messages.post.title}</h1>
          <p className="text-body-md text-secondary">{messages.post.subtitle}</p>
        </section>

        <PostForm />
      </div>
    </main>
  );
}
