'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import { useMessages } from '@/lib/i18n/useMessages';

function AuthErrorFromUrlInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { messages } = useMessages();

  useEffect(() => {
    if (searchParams.get('auth') !== 'error') return;

    toast(messages.auth.oauthError);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('auth');
    params.delete('provider');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, messages.auth.oauthError]);

  return null;
}

export function AuthErrorFromUrl() {
  return (
    <Suspense fallback={null}>
      <AuthErrorFromUrlInner />
    </Suspense>
  );
}
