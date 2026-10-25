'use client';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { useMessages } from '@/lib/i18n/useMessages';
import { isPaywallFlagEnabled } from '@/lib/paywall/gate';

export function PrivacyPageClient() {
  const { messages } = useMessages();
  const p = messages.privacy;
  // Stripe and subscription data only exist once the paywall is on.
  const paid = isPaywallFlagEnabled();

  return (
    <LegalDocumentPage
      title={p.title}
      lastUpdated={paid ? p.lastUpdatedPaid : p.lastUpdated}
      intro={p.intro}
      backHome={p.backHome}
      sections={[
        { title: p.collectTitle, body: p.collectBody },
        { title: p.useTitle, body: p.useBody },
        { title: p.authTitle, body: p.authBody },
        { title: p.sharingTitle, body: paid ? p.sharingBodyPaid : p.sharingBody },
        ...(paid ? [{ title: p.paymentsTitle, body: p.paymentsBody }] : []),
        { title: p.retentionTitle, body: paid ? p.retentionBodyPaid : p.retentionBody },
        { title: p.contactTitle, body: p.contactBody },
      ]}
    />
  );
}
