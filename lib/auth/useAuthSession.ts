'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';

type AuthSessionState = {
  user: User | null;
  email: string | null;
  loading: boolean;
};

const INITIAL: AuthSessionState = { user: null, email: null, loading: true };

/** Client auth state — uses getSession (local) + onAuthStateChange; avoids getUser lock contention. */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(INITIAL);

  useEffect(() => {
    if (!getSupabaseEnv()) {
      setState({ user: null, email: null, loading: false });
      return;
    }

    const supabase = createClient();
    let settled = false;
    let cancelled = false;

    const applySession = (session: Session | null) => {
      settled = true;
      if (cancelled) return;
      setState({
        user: session?.user ?? null,
        email: session?.user?.email ?? null,
        loading: false,
      });
    };

    const timeout = window.setTimeout(() => {
      if (!settled) {
        applySession(null);
      }
    }, 5000);

    void supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
