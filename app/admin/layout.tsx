import { resolveUserEmail } from '@/lib/admin/operator-access';
import { AdminShell } from '@/components/admin/AdminShell';
import { getFooterStats, getPendingTranslationCount } from '@/lib/admin/queries';
import { createClient } from '@/lib/supabase/server';

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
      operatorEmail={user ? (resolveUserEmail(user) ?? '') : ''}
      pendingTranslationsCount={pendingTranslationsCount}
      footerStats={footerStats}
    >
      {children}
    </AdminShell>
  );
}
