'use client';

import { useSearchParams } from 'next/navigation';
import { AccountHeaderSection } from '@/components/settings/AccountHeaderSection';
import { AccountSection } from '@/components/settings/AccountSection';
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
    <main className="mx-auto flex min-h-full max-w-[800px] flex-col bg-surface px-gutter py-space-xl pb-28">
      <section className="mb-6 space-y-1">
        <h1 className="text-h2 font-semibold text-primary">{messages.settings.title}</h1>
        <p className="text-body-md text-secondary">{messages.settings.subtitle}</p>
      </section>

      <AccountHeaderSection />
      <GeneralSection />
      <NotificationsSection />
      <ZonesSection autoOpenCreate={autoOpenCreate} />
      <LanguageSection />
      <AccountSection />
      <AdvancedSection />
    </main>
  );
}
