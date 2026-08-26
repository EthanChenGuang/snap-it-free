'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SafetyBanner } from '@/components/messages/SafetyBanner';
import { SafetyModal } from '@/components/messages/SafetyModal';
import type { DmMessage } from '@/lib/messages/useConversationThread';
import { safetyAckKey } from '@/lib/messages/useConversationThread';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type ConversationThreadProps = {
  listing: {
    id: string;
    title: string;
    photo_url: string;
  };
  conversationId: string | null;
  readOnly: boolean;
  loading: boolean;
  messagesList: DmMessage[];
  userId: string | null;
  onSend: (text: string) => Promise<boolean>;
  variant?: 'drawer' | 'page';
  showInboxLink?: boolean;
  showListingBar?: boolean;
};

export function ConversationThread({
  listing,
  conversationId,
  readOnly,
  loading,
  messagesList,
  userId,
  onSend,
  variant = 'drawer',
  showInboxLink = false,
  showListingBar = true,
}: ConversationThreadProps) {
  const { messages, formatRelativeTime } = useMessages();
  const QUICK_REPLIES = [
    messages.dm.quickReply1,
    messages.dm.quickReply2,
    messages.dm.quickReply3,
  ];

  const [inputText, setInputText] = useState('');
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesList]);

  const handleSendAttempt = (textToSend?: string) => {
    const text = textToSend ?? inputText;
    if (!text.trim() || readOnly || !conversationId) return;

    const acked = localStorage.getItem(safetyAckKey(conversationId)) === '1';
    if (!acked) {
      setPendingMessage(text.trim());
      setSafetyOpen(true);
      return;
    }

    void (async () => {
      const sent = await onSend(text);
      if (sent) setInputText('');
    })();
  };

  const handleSafetyAck = () => {
    if (conversationId) {
      localStorage.setItem(safetyAckKey(conversationId), '1');
    }
    setSafetyOpen(false);
    if (pendingMessage) {
      void (async () => {
        const sent = await onSend(pendingMessage);
        if (sent) setInputText('');
        setPendingMessage(null);
      })();
    }
  };

  const handleSafetyCancel = () => {
    setSafetyOpen(false);
    setPendingMessage(null);
  };

  const inputDisabled = readOnly || !conversationId;

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', variant === 'page' && 'h-full')}>
        {showListingBar ? (
          <Link
            href={`/listing/${listing.id}`}
            className="flex items-center gap-space-sm border-b border-outline-variant bg-surface-container-low px-gutter py-space-sm transition hover:bg-surface-container"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-outline-variant">
              <Image src={listing.photo_url} alt="" fill className="object-cover" sizes="44px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-md font-semibold text-on-surface">{listing.title}</p>
              <p className="text-label-sm text-on-surface-variant">{messages.detail.costFreeLabel}</p>
            </div>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant">
              chevron_right
            </span>
          </Link>
        ) : null}

        {readOnly && (
          <div className="border-b border-outline-variant bg-surface-container-low px-gutter py-space-sm text-label-sm text-on-surface-variant">
            {messages.dm.fcfsNotice}
          </div>
        )}

        {conversationId && !readOnly && <SafetyBanner conversationId={conversationId} />}

        <div
          ref={scrollRef}
          className={cn(
            'flex-1 overflow-y-auto bg-surface px-gutter py-space-md',
            variant === 'page' && 'min-h-0',
          )}
        >
          {loading && !conversationId && !readOnly ? (
            <p className="text-center text-label-sm text-on-surface-variant">…</p>
          ) : messagesList.length === 0 ? (
            <p className="text-center text-label-sm text-on-surface-variant">
              {messages.dm.emptyThread}
            </p>
          ) : (
            <div className="flex flex-col gap-space-md">
              {messagesList.map((msg) => {
                const isUser = msg.sender_id === userId;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] px-space-md py-space-sm',
                        isUser
                          ? 'rounded-2xl rounded-br-md bg-primary text-on-primary'
                          : 'rounded-2xl rounded-bl-md border border-outline-variant bg-surface-container-low text-on-surface',
                      )}
                    >
                      <p className="text-body-md leading-relaxed">{msg.body}</p>
                      <p
                        className={cn(
                          'mt-space-xs text-right text-label-sm',
                          isUser ? 'text-on-primary/70' : 'text-on-surface-variant',
                        )}
                      >
                        {formatRelativeTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant bg-surface-container-lowest px-gutter py-space-sm pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
          {showInboxLink && conversationId ? (
            <Link
              href={`/messages/${conversationId}`}
              className="mb-space-sm block text-center text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
            >
              {messages.inbox.openInInbox}
            </Link>
          ) : null}

          <div className="mb-space-sm flex gap-space-xs overflow-x-auto no-scrollbar">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                disabled={inputDisabled}
                onClick={() => handleSendAttempt(reply)}
                className="shrink-0 rounded-full bg-[#f1f1f0] px-space-md py-space-xs text-label-sm text-on-surface transition hover:bg-surface-container disabled:opacity-40"
              >
                {reply}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-space-sm">
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSendAttempt();
              }}
              placeholder={messages.dm.inputPlaceholder}
              disabled={inputDisabled}
              className="flex-1 rounded-full border border-outline-variant bg-surface px-space-md py-space-sm text-body-md text-on-surface outline-none focus:border-primary disabled:opacity-40"
            />
            <button
              type="button"
              disabled={inputDisabled || !inputText.trim()}
              onClick={() => handleSendAttempt()}
              aria-label={messages.dm.send}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition',
                inputText.trim() && !inputDisabled
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-lg">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>

      <SafetyModal
        open={safetyOpen}
        onOpenChange={(next) => {
          if (!next) handleSafetyCancel();
          else setSafetyOpen(true);
        }}
        onAcknowledge={handleSafetyAck}
      />
    </>
  );
}
