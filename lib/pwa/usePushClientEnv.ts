'use client';

import { useEffect, useState } from 'react';
import {
  canOfferPush,
  isIOS,
  isIosPushDismissed,
  isStandalonePwa,
} from '@/lib/pwa/ios-detect';

export type PushClientEnv = {
  hydrated: boolean;
  pushSupported: boolean;
  iosNonStandalone: boolean;
  iosDismissed: boolean;
};

const SSR_DEFAULT: PushClientEnv = {
  hydrated: false,
  pushSupported: false,
  iosNonStandalone: false,
  iosDismissed: false,
};

function readPushClientEnv(): Omit<PushClientEnv, 'hydrated'> {
  return {
    pushSupported: canOfferPush(),
    iosNonStandalone: isIOS() && !isStandalonePwa(),
    iosDismissed: isIosPushDismissed(),
  };
}

/** Browser-only push/PWA flags — stable on SSR and first client paint to avoid hydration mismatch. */
export function usePushClientEnv(): PushClientEnv {
  const [env, setEnv] = useState<PushClientEnv>(SSR_DEFAULT);

  useEffect(() => {
    setEnv({ ...readPushClientEnv(), hydrated: true });
  }, []);

  return env;
}
