'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useMessages } from '@/lib/i18n/useMessages';

export function LogoutSection() {
  const { messages } = useMessages();
  const { email, loading } = useAuthSession();

  if (loading || !email) {
    return null;
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <section className="mt-2">
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="w-full rounded-2xl bg-white py-3.5 text-center text-body-md font-semibold text-red-600 shadow-sm transition-colors active:bg-red-50"
      >
        {messages.settings.signOut}
      </button>
    </section>
  );
}
