import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { getFooterStats, getPendingTranslationCount } from '@/lib/admin/queries';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [pendingTranslationsCount, footerStats] = await Promise.all([
    getPendingTranslationCount(),
    getFooterStats(),
  ]);

  return (
    <AdminShell
      operatorEmail={user?.email ?? ''}
      pendingTranslationsCount={pendingTranslationsCount}
      footerStats={footerStats}
    >
      {children}
    </AdminShell>
  );
}
