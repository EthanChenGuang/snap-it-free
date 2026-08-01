'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafetyBanner } from '@/components/messages/SafetyBanner';
import { SafetyModal } from '@/components/messages/SafetyModal';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTimeItalian, messages } from '@/messages/it';

type DmMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type DmDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    photo_url: string;
  };
  conversationId: string | null;
  readOnly: boolean;
  onConversationReady: (id: string, readOnly: boolean) => void;
};

const POLL_MS = 10_000;
const QUICK_REPLIES = [
  messages.dm.quickReply1,
  messages.dm.quickReply2,
  messages.dm.quickReply3,
];

function safetyAckKey(conversationId: string) {
  return `safety_ack_${conversationId}`;
}

export function DmDrawer({
  open,
  onOpenChange,
  listing,
  conversationId,
  readOnly,
  onConversationReady,
}: DmDrawerProps) {
  const [messagesList, setMessagesList] = useState<DmMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const startConversation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      });

      const data = (await res.json()) as {
        id?: string;
        readOnly?: boolean;
        reason?: string;
        error?: string;
      };

      if (!res.ok) {
        toast(data.error ?? messages.dm.sendError);
        return;
      }

      if (data.readOnly) {
        onConversationReady('', true);
        return;
      }

      if (data.id) {
        onConversationReady(data.id, false);
      }
    } catch {
      toast(messages.dm.sendError);
    } finally {
      setLoading(false);
    }
  }, [listing.id, onConversationReady]);

  useEffect(() => {
    if (open && !conversationId && !readOnly && !loading) {
      void startConversation();
    }
  }, [open, conversationId, readOnly, loading, startConversation]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    const since = lastTimestampRef.current;
    const url = since
      ? `/api/messages/conversations/${conversationId}/messages?since=${encodeURIComponent(since)}`
      : `/api/messages/conversations/${conversationId}/messages`;

    try {
      const res = await fetch(url);
      if (!res.ok) return;

      const data = (await res.json()) as { messages: DmMessage[] };
      const incoming = data.messages ?? [];

      if (incoming.length === 0) return;

      setMessagesList((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const msg of incoming) {
          if (!ids.has(msg.id)) merged.push(msg);
        }
        merged.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        return merged;
      });

      const latest = incoming[incoming.length - 1];
      lastTimestampRef.current = latest.created_at;
    } catch {
      // silent poll failure
    }
  }, [conversationId]);

  useEffect(() => {
    if (!open || !conversationId) return;

    lastTimestampRef.current = null;
    setMessagesList([]);
    void fetchMessages();

    const interval = window.setInterval(() => {
      void fetchMessages();
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [open, conversationId, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesList]);

  const sendMessage = async (text: string) => {
    if (!conversationId || readOnly || !text.trim()) return;

    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text.trim() }),
      });

      if (res.status === 429) {
        toast(messages.dm.rateLimit);
        return;
      }

      if (!res.ok) {
        toast(messages.dm.sendError);
        return;
      }

      const data = (await res.json()) as { message: DmMessage };
      setMessagesList((prev) => [...prev, data.message]);
      lastTimestampRef.current = data.message.created_at;
      setInputText('');
    } catch {
      toast(messages.dm.sendError);
    }
  };

  const handleSendAttempt = (textToSend?: string) => {
    const text = textToSend ?? inputText;
    if (!text.trim() || readOnly || !conversationId) return;

    const acked = localStorage.getItem(safetyAckKey(conversationId)) === '1';
    if (!acked) {
      setPendingMessage(text.trim());
      setSafetyOpen(true);
      return;
    }

    void sendMessage(text);
  };

  const handleSafetyAck = () => {
    if (conversationId) {
      localStorage.setItem(safetyAckKey(conversationId), '1');
    }
    setSafetyOpen(false);
    if (pendingMessage) {
      void sendMessage(pendingMessage);
      setPendingMessage(null);
    }
  };

  const handleSafetyCancel = () => {
    setSafetyOpen(false);
    setPendingMessage(null);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[80dvh] sm:bottom-0">
          <DrawerHeader className="border-b border-outline-variant pb-space-sm">
            <div className="flex items-center justify-between">
              <DrawerTitle>{messages.dm.drawerTitle}</DrawerTitle>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container"
                  aria-label={messages.dm.close}
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex items-center gap-space-sm border-b border-outline-variant bg-surface-container-low px-gutter py-space-sm">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-outline-variant">
              <Image src={listing.photo_url} alt="" fill className="object-cover" sizes="36px" />
            </div>
            <span className="truncate max-w-[220px] text-label-md font-semibold text-on-surface">
              {listing.title}
            </span>
          </div>

          {readOnly && (
            <div className="border-b border-outline-variant bg-surface-container-low px-gutter py-space-sm text-label-sm text-on-surface-variant">
              {messages.dm.fcfsNotice}
            </div>
          )}

          {conversationId && !readOnly && <SafetyBanner conversationId={conversationId} />}

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-surface-container-low px-gutter py-space-md"
          >
            {loading && !conversationId && !readOnly ? (
              <p className="text-center text-label-sm text-on-surface-variant">…</p>
            ) : messagesList.length === 0 ? (
              <p className="text-center text-label-sm text-on-surface-variant">
                {messages.dm.emptyThread}
              </p>
            ) : (
              <div className="flex flex-col gap-space-sm">
                {messagesList.map((msg) => {
                  const isUser = msg.sender_id === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded px-space-sm py-space-sm text-body-md ${
                          isUser
                            ? 'bg-on-surface text-surface'
                            : 'border border-outline-variant bg-surface text-on-surface'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.body}</p>
                        <p
                          className={`mt-space-xs text-right text-[10px] ${
                            isUser ? 'text-surface/70' : 'text-on-surface-variant'
                          }`}
                        >
                          {formatRelativeTimeItalian(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant bg-surface px-gutter py-space-sm">
            <div className="mb-space-sm flex gap-space-xs overflow-x-auto no-scrollbar">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  disabled={readOnly || !conversationId}
                  onClick={() => handleSendAttempt(reply)}
                  className="shrink-0 rounded border border-outline-variant bg-surface-container-low px-space-sm py-space-xs text-label-sm text-on-surface hover:bg-surface-container disabled:opacity-40"
                >
                  {reply}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-space-sm">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSendAttempt();
                }}
                placeholder={messages.dm.inputPlaceholder}
                disabled={readOnly || !conversationId}
                className="flex-1 rounded border border-outline-variant bg-surface px-space-sm py-space-sm text-body-md text-on-surface outline-none focus:border-primary disabled:opacity-40"
              />
              <Button
                type="button"
                size="icon"
                disabled={readOnly || !conversationId || !inputText.trim()}
                onClick={() => handleSendAttempt()}
                aria-label={messages.dm.send}
              >
                <span className="material-symbols-outlined text-base">send</span>
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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
