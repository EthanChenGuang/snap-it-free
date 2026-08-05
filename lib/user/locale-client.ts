'use client';

import type { AppLanguage } from '@/lib/settings/preferences';
import { writeAppPreferences } from '@/lib/settings/preferences';

export function setAppLanguage(language: AppLanguage): void {
  writeAppPreferences({ language });
  void syncLocaleToServer(language);
}

async function syncLocaleToServer(language: AppLanguage): Promise<void> {
  try {
    // Imported here rather than at module scope: the language dropdown lives in the
    // root layout, and a static import would pull the Supabase SDK into app/layout.js.
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    await fetch('/api/user/locale', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
  } catch {
    // fire-and-forget — local preference already saved
  }
}
