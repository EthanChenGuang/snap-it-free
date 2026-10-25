'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import {
  isIOS,
  isIosPushDismissed,
  isStandalonePwa,
  markIosGuideShownThisSession,
  wasIosGuideShownThisSession,
} from '@/lib/pwa/ios-detect';

/**
 * Headless. Holds the only auth dependency in the root layout, so keeping it in its
 * own chunk keeps the Supabase SDK out of app/layout.js.
 */
export function IosGuideAutoOpen({
  onOpen,
  suspended = false,
}: {
  onOpen: () => void;
  suspended?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuthSession();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    if (
      suspended ||
      pathname !== '/settings' ||
      !isLoggedIn ||
      !isIOS() ||
      isStandalonePwa() ||
      isIosPushDismissed() ||
      wasIosGuideShownThisSession()
    ) {
      return;
    }

    markIosGuideShownThisSession();
    onOpen();
  }, [pathname, isLoggedIn, onOpen, suspended]);

  return null;
}
