'use client';

import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { PostForm } from '@/components/ugc/PostForm';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useMessages } from '@/lib/i18n/useMessages';
import { useState } from 'react';

export function PostPageClient() {
  const { messages } = useMessages();
  const { user, loading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-lg pb-4">
        <div className="flex flex-1 items-center justify-center py-space-xl text-label-sm text-on-surface-variant">
          …
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-lg pb-4">
          <div className="flex flex-col items-center gap-space-md px-gutter py-space-xl text-center">
            <span
              className="material-symbols-outlined text-4xl text-on-surface-variant"
              aria-hidden="true"
            >
              add_a_photo
            </span>
            <h2 className="text-h3 font-semibold text-on-surface">{messages.post.gateTitle}</h2>
            <p className="max-w-sm text-body-md text-on-surface-variant">
              {messages.post.gateDescription}
            </p>
            <Button type="button" onClick={() => setAuthOpen(true)}>
              {messages.auth.modalTitle}
            </Button>
          </div>
        </main>
        <AuthPromptModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          redirectTo="/post"
          modalTitle={messages.auth.postTitle}
        />
      </>
    );
  }

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
