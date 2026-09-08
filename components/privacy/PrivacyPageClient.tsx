'use client';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { useMessages } from '@/lib/i18n/useMessages';

export function PrivacyPageClient() {
  const { messages } = useMessages();
  const p = messages.privacy;

  return (
    <LegalDocumentPage
      title={p.title}
      lastUpdated={p.lastUpdated}
      intro={p.intro}
      backHome={p.backHome}
      sections={[
        { title: p.collectTitle, body: p.collectBody },
        { title: p.useTitle, body: p.useBody },
        { title: p.authTitle, body: p.authBody },
        { title: p.sharingTitle, body: p.sharingBody },
        { title: p.retentionTitle, body: p.retentionBody },
        { title: p.contactTitle, body: p.contactBody },
      ]}
    />
  );
}
