'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConversationThread } from '@/components/messages/ConversationThread';
import { useConversationThread } from '@/lib/messages/useConversationThread';
import { markConversationRead } from '@/lib/messages/inbox-read-state';
import { useMessages } from '@/lib/i18n/useMessages';

type ConversationPageClientProps = {
  conversationId: string;
  listing: {
    id: string;
    title: string;
    photo_url: string;
  };
  readOnly: boolean;
};

export function ConversationPageClient({
  conversationId,
  listing,
  readOnly,
}: ConversationPageClientProps) {
  const router = useRouter();
  const { messages } = useMessages();
  const { messagesList, userId, loading, sendMessage } = useConversationThread({
    conversationId,
    readOnly,
    enabled: true,
  });

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, messagesList.length]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex items-center gap-space-sm border-b border-outline-variant px-gutter py-space-sm">
        <button
          type="button"
          onClick={() => router.push('/messages')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface hover:bg-surface-container"
          aria-label={messages.inbox.back}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-label-md font-semibold text-on-surface">{listing.title}</h1>
          <Link
            href={`/listing/${listing.id}`}
            className="text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
          >
            {messages.inbox.viewListing}
          </Link>
        </div>
      </header>

      <ConversationThread
        listing={listing}
        conversationId={conversationId}
        readOnly={readOnly}
        loading={loading}
        messagesList={messagesList}
        userId={userId}
        onSend={sendMessage}
        variant="page"
        showListingBar={false}
      />
    </div>
  );
}
