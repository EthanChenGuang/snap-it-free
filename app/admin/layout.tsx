import { resolveUserEmail } from '@/lib/admin/operator-access';
import { AdminShell } from '@/components/admin/AdminShell';
import { getFooterStats, getPendingTranslationCount } from '@/lib/admin/queries';
import { createClient } from '@/lib/supabase/server';
import { getOperatorServiceClient } from '@/lib/admin/operator-access';
import { getPendingFeaturedCount } from '@/lib/featured/admin';

async function loadFeaturedPendingCount(): Promise<number> {
  try {
    return await getPendingFeaturedCount(getOperatorServiceClient());
  } catch {
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [pendingTranslationsCount, footerStats, featuredPendingCount] = await Promise.all([
    getPendingTranslationCount(),
    getFooterStats(),
    loadFeaturedPendingCount(),
  ]);

  return (
    <AdminShell
      operatorEmail={user ? (resolveUserEmail(user) ?? '') : ''}
      pendingTranslationsCount={pendingTranslationsCount}
      featuredPendingCount={featuredPendingCount}
      footerStats={footerStats}
    >
      {children}
    </AdminShell>
  );
}
