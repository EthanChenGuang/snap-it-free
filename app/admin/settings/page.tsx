import { SettingsClient, SettingsLoadError } from '@/components/admin/SettingsClient';
import { getGlobalSettingsConfig, getOperatorAllowlist } from '@/lib/admin/queries';
import { requireAuth } from '@/lib/supabase/auth';

export default async function AdminSettingsPage() {
  const [config, operators, user] = await Promise.all([
    getGlobalSettingsConfig(),
    getOperatorAllowlist(),
    requireAuth(),
  ]);

  if (!config) {
    return <SettingsLoadError />;
  }

  return (
    <SettingsClient
      initialConfig={config}
      initialOperators={operators}
      currentUserEmail={user?.email ?? ''}
    />
  );
}
