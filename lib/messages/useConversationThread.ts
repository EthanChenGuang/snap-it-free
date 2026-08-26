'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { useMessages } from '@/lib/i18n/useMessages';

export type DmMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const POLL_MS = 10_000;

export function safetyAckKey(conversationId: string) {
  return `safety_ack_${conversationId}`;
}

type UseConversationThreadOptions = {
  conversationId: string | null;
  readOnly: boolean;
  enabled: boolean;
};

export function useConversationThread({
  conversationId,
  readOnly,
  enabled,
}: UseConversationThreadOptions) {
  const { messages } = useMessages();
  const [messagesList, setMessagesList] = useState<DmMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

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
    if (!enabled || !conversationId) return;

    lastTimestampRef.current = null;
    setMessagesList([]);
    void fetchMessages();

    const interval = window.setInterval(() => {
      void fetchMessages();
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, conversationId, fetchMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || readOnly || !text.trim()) return false;

      try {
        const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text.trim() }),
        });

        if (res.status === 429) {
          toast(messages.dm.rateLimit);
          return false;
        }

        if (!res.ok) {
          toast(messages.dm.sendError);
          return false;
        }

        const data = (await res.json()) as { message: DmMessage };
        setMessagesList((prev) => [...prev, data.message]);
        lastTimestampRef.current = data.message.created_at;
        return true;
      } catch {
        toast(messages.dm.sendError);
        return false;
      }
    },
    [conversationId, readOnly, messages.dm.rateLimit, messages.dm.sendError],
  );

  return {
    messagesList,
    userId,
    loading,
    setLoading,
    sendMessage,
    fetchMessages,
  };
}
