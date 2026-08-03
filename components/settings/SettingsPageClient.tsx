'use client';

import { useSearchParams } from 'next/navigation';
import { AlertsSection } from '@/components/settings/AlertsSection';
import { MatchesSection } from '@/components/settings/MatchesSection';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { messages } from '@/messages/it';

export function SettingsPageClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const autoOpenCreate = tab === 'alerts';

  return (
    <main className="mx-auto flex min-h-full max-w-container-max flex-col px-gutter py-space-lg">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <p className="text-label-sm text-on-surface-variant">{messages.nav.settings}</p>
        <h1 className="text-h2 font-bold text-on-surface">{messages.settings.title}</h1>
        <p className="mt-space-xs text-body-md text-secondary">{messages.settings.subtitle}</p>
      </div>

      <ProfileSection />
      <AlertsSection autoOpenCreate={autoOpenCreate} />
      <MatchesSection />
    </main>
  );
}
