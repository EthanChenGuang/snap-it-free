import { Suspense } from 'react';
import { getOperatorDataClient } from '@/lib/admin/operator-access';
import { adminShellMessages } from '@/components/admin/admin-messages';
import { BillingClient, BillingSkeleton } from '@/components/admin/BillingClient';
import { collectPlatformUsageSnapshot } from '@/lib/admin/platform-usage-collect';
import { buildBillingServiceMeta } from '@/lib/admin/service-dashboard-links';

async function BillingContent() {
  const supabase = await getOperatorDataClient();
  if (!supabase) {
    const serviceMeta = buildBillingServiceMeta(null);
    return (
      <BillingClient
        initialSnapshot={null}
        initialError={adminShellMessages.loadError}
        serviceMeta={serviceMeta}
      />
    );
  }

  try {
    const snapshot = await collectPlatformUsageSnapshot(supabase);
    const serviceMeta = buildBillingServiceMeta(snapshot);
    return (
      <BillingClient initialSnapshot={snapshot} initialError={null} serviceMeta={serviceMeta} />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载失败';
    const serviceMeta = buildBillingServiceMeta(null);
    return (
      <BillingClient initialSnapshot={null} initialError={message} serviceMeta={serviceMeta} />
    );
  }
}

export default function AdminBillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}
