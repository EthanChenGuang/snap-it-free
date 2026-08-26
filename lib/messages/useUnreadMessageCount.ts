'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import {
  countUnreadConversations,
  INBOX_READ_CHANGE_EVENT,
  type InboxConversationPreview,
} from '@/lib/messages/inbox-read-state';

const POLL_INTERVAL_MS = 60_000;

export function useUnreadMessageCount() {
  const { user } = useAuthSession();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/messages/conversations');
      if (response.status === 401) {
        setCount(0);
        return;
      }
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { conversations?: InboxConversationPreview[] };
      const conversations = payload.conversations ?? [];
      setCount(countUnreadConversations(conversations, user.id));
    } catch {
      // Keep last good count on transient errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener(INBOX_READ_CHANGE_EVENT, onFocus);

    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(INBOX_READ_CHANGE_EVENT, onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { count, loading, refresh };
}
