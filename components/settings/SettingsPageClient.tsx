'use client';

import { useSearchParams } from 'next/navigation';
import { AdvancedSection } from '@/components/settings/AdvancedSection';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { LanguageSection } from '@/components/settings/LanguageSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { ZonesSection } from '@/components/settings/ZonesSection';
import { useMessages } from '@/lib/i18n/useMessages';

export function SettingsPageClient() {
  const { messages } = useMessages();

  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const autoOpenCreate = tab === 'alerts';

  return (
    <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-xl pb-32">
      <section className="mb-space-xl space-y-space-xs">
        <h1 className="text-h2 font-semibold text-primary">{messages.settings.title}</h1>
        <p className="text-body-md text-secondary">{messages.settings.subtitle}</p>
      </section>

      <GeneralSection />
      <NotificationsSection />
      <ZonesSection autoOpenCreate={autoOpenCreate} />
      <LanguageSection />
      <AdvancedSection />
    </main>
  );
}
