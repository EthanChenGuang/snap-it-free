'use client';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { useMessages } from '@/lib/i18n/useMessages';
import { isPaywallFlagEnabled } from '@/lib/paywall/gate';

export function TermsPageClient() {
  const { messages } = useMessages();
  const t = messages.terms;
  // Subscription terms apply only once the paywall is on; until then the free-service terms stand unchanged.
  const paid = isPaywallFlagEnabled();

  return (
    <LegalDocumentPage
      title={t.title}
      lastUpdated={paid ? t.lastUpdatedPaid : t.lastUpdated}
      intro={t.intro}
      backHome={t.backHome}
      sections={[
        { title: t.serviceTitle, body: t.serviceBody },
        { title: t.accountTitle, body: t.accountBody },
        { title: t.contentTitle, body: t.contentBody },
        ...(paid
          ? [
              { title: t.subscriptionTitle, body: t.subscriptionBody },
              { title: t.cancelTitle, body: t.cancelBody },
              { title: t.paymentsTitle, body: t.paymentsBody },
            ]
          : []),
        { title: t.liabilityTitle, body: t.liabilityBody },
        { title: t.contactTitle, body: t.contactBody },
      ]}
    />
  );
}
