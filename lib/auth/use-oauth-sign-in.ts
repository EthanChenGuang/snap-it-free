'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buildOAuthCallbackUrl } from './build-oauth-callback-url';

type OAuthProvider = 'google';
type OAuthStatus = 'idle' | 'loading' | 'error';

export function useOAuthSignIn(redirectTo: string) {
  const [status, setStatus] = useState<OAuthStatus>('idle');

  const signIn = useCallback(
    async (provider: OAuthProvider) => {
      setStatus('loading');
      const supabase = createClient();
      const redirectToUrl = buildOAuthCallbackUrl(redirectTo, window.location.origin);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) {
        setStatus('error');
      }
    },
    [redirectTo],
  );

  return {
    signIn,
    status,
    isBusy: status === 'loading',
  };
}
