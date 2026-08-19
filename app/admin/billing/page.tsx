import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { BillingClient, BillingSkeleton } from '@/components/admin/BillingClient';
import { collectPlatformUsageSnapshot } from '@/lib/admin/platform-usage';

async function BillingContent() {
  const supabase = await createClient();
  try {
    const snapshot = await collectPlatformUsageSnapshot(supabase);
    return <BillingClient initialSnapshot={snapshot} initialError={null} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载失败';
    return <BillingClient initialSnapshot={null} initialError={message} />;
  }
}

export default function AdminBillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}
