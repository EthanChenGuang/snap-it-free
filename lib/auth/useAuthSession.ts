'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

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
    const supabase = createClient();
    let settled = false;

    const applySession = (session: Session | null) => {
      settled = true;
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
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
