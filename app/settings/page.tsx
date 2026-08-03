import { Suspense } from 'react';
import { SettingsPageClient } from '@/components/settings/SettingsPageClient';
import { messages } from '@/messages/it';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-full max-w-container-max flex-col px-gutter py-space-lg">
          <div className="mb-space-lg border-b border-outline-variant pb-space-md">
            <p className="text-label-sm text-on-surface-variant">{messages.nav.settings}</p>
            <h1 className="text-h2 font-bold text-on-surface">{messages.settings.title}</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
        </main>
      }
    >
      <SettingsPageClient />
    </Suspense>
  );
}
