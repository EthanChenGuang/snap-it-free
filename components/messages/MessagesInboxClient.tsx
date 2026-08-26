'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useMessages } from '@/lib/i18n/useMessages';

type InboxConversation = {
  id: string;
  listingId: string;
  role: 'buyer' | 'seller';
  createdAt: string;
  listing: {
    id: string;
    title: string;
    photoUrl: string;
    status: string;
  };
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export function MessagesInboxClient() {
  const { messages, formatRelativeTime } = useMessages();
  const { user, loading: authLoading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/messages/conversations');
      if (res.status === 401) {
        setConversations([]);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { conversations: InboxConversation[] };
      setConversations(data.conversations ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadConversations();
  }, [authLoading, user, loadConversations]);

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-space-xl text-label-sm text-on-surface-variant">
        …
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center gap-space-md px-gutter py-space-xl text-center">
          <h2 className="text-h3 font-semibold text-on-surface">{messages.inbox.signInTitle}</h2>
          <p className="max-w-sm text-body-md text-on-surface-variant">
            {messages.inbox.signInDescription}
          </p>
          <Button type="button" onClick={() => setAuthOpen(true)}>
            {messages.auth.modalTitle}
          </Button>
        </div>
        <AuthPromptModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          redirectTo="/messages"
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-space-xl text-label-sm text-on-surface-variant">
        …
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-space-md px-gutter py-space-xl text-center">
        <p className="text-body-md text-on-surface-variant">{messages.inbox.loadError}</p>
        <Button type="button" variant="secondary" onClick={() => void loadConversations()}>
          {messages.inbox.retry}
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-space-md px-gutter py-space-xl text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">chat</span>
        <h2 className="text-h3 font-semibold text-on-surface">{messages.inbox.emptyTitle}</h2>
        <p className="max-w-sm text-body-md text-on-surface-variant">
          {messages.inbox.emptyDescription}
        </p>
        <Button asChild variant="secondary">
          <Link href="/">{messages.inbox.browseFeed}</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-outline-variant border-y border-outline-variant">
      {conversations.map((conversation) => {
        const preview = conversation.lastMessage?.body ?? messages.dm.emptyThread;
        const timeLabel = formatRelativeTime(
          conversation.lastMessage?.createdAt ?? conversation.createdAt,
        );
        const roleLabel =
          conversation.role === 'buyer'
            ? messages.inbox.roleBuyer
            : messages.inbox.roleSeller;

        return (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              className="flex items-center gap-space-md px-gutter py-space-md transition hover:bg-surface-container-low"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-container-low">
                {conversation.listing.photoUrl ? (
                  <Image
                    src={conversation.listing.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant">image</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-space-sm">
                  <p className="truncate text-label-md font-semibold text-on-surface">
                    {conversation.listing.title}
                  </p>
                  <span
                    className="shrink-0 text-label-sm text-on-surface-variant"
                    suppressHydrationWarning
                  >
                    {timeLabel}
                  </span>
                </div>
                <p className="text-label-sm text-on-surface-variant">{roleLabel}</p>
                <p className="truncate text-body-md text-on-surface-variant">{preview}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
