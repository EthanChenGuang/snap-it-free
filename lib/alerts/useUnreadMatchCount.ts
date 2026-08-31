'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/auth/useAuthSession';

const POLL_INTERVAL_MS = 60_000;

export function useUnreadMatchCount() {
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
      const response = await fetch('/api/alerts/matches/unread-count');
      if (response.status === 401) {
        setCount(0);
        return;
      }
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { count?: number };
      setCount(typeof payload.count === 'number' ? payload.count : 0);
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

    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { count, loading, refresh };
}
