'use client';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { useMessages } from '@/lib/i18n/useMessages';

export function TermsPageClient() {
  const { messages } = useMessages();
  const t = messages.terms;

  return (
    <LegalDocumentPage
      title={t.title}
      lastUpdated={t.lastUpdated}
      intro={t.intro}
      backHome={t.backHome}
      sections={[
        { title: t.serviceTitle, body: t.serviceBody },
        { title: t.accountTitle, body: t.accountBody },
        { title: t.contentTitle, body: t.contentBody },
        { title: t.liabilityTitle, body: t.liabilityBody },
        { title: t.contactTitle, body: t.contactBody },
      ]}
    />
  );
}
