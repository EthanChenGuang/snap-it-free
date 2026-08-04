import { Suspense } from 'react';
import { SettingsPageClient } from '@/components/settings/SettingsPageClient';
import { messages } from '@/messages/it';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-xl pb-32">
          <section className="mb-space-xl space-y-space-xs">
            <h1 className="text-h2 font-semibold text-primary">{messages.settings.title}</h1>
            <p className="text-body-md text-secondary">{messages.settings.subtitle}</p>
          </section>
          <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
        </main>
      }
    >
      <SettingsPageClient />
    </Suspense>
  );
}
