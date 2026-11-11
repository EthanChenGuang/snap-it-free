'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import { useMessages } from '@/lib/i18n/useMessages';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';

/** Params Supabase or our callback put on the URL after a sign-in attempt; removed once handled. */
const AUTH_RESULT_PARAMS = ['auth', 'provider', 'error', 'error_code', 'error_description', 'code'];

function AuthErrorFromUrlInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { messages } = useMessages();

  useEffect(() => {
    const oauthFailed = searchParams.get('auth') === 'error';
    // An email link that Supabase rejected (expired, or already used, e.g. by a mail scanner).
    const emailLinkRejected = !oauthFailed && searchParams.has('error_code');
    // An email link that came back with a PKCE code: it only signs in if this browser holds the verifier.
    const pkceCode = pathname !== '/auth/callback' && searchParams.get('code');
    if (!oauthFailed && !emailLinkRejected && !pkceCode) return;

    let cancelled = false;
    const cleanUrl = () => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of AUTH_RESULT_PARAMS) params.delete(key);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    if (oauthFailed) {
      toast(messages.auth.oauthError);
      cleanUrl();
    } else if (emailLinkRejected) {
      toast(messages.auth.emailLinkFailed);
      cleanUrl();
    } else if (getSupabaseEnv()) {
      // The browser client exchanges the code on load; give it a moment, then say so if it didn't work.
      const timer = window.setTimeout(() => {
        void createClient()
          .auth.getSession()
          .then(({ data }) => {
            if (cancelled) return;
            if (!data.session) toast(messages.auth.emailLinkFailed);
            cleanUrl();
          });
      }, 1500);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, messages.auth.oauthError, messages.auth.emailLinkFailed]);

  return null;
}

export function AuthErrorFromUrl() {
  return (
    <Suspense fallback={null}>
      <AuthErrorFromUrlInner />
    </Suspense>
  );
}
