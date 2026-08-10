import type { SupabaseClient } from '@supabase/supabase-js';

export async function deleteAccountData(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ error: string | null }> {
  const paths: string[] = [];
  const limit = 100;
  let offset = 0;

  for (;;) {
    const { data, error: listError } = await serviceClient.storage
      .from('ugc-photos')
      .list(userId, { limit, offset });

    if (listError) {
      return { error: listError.message };
    }

    if (!data || data.length === 0) {
      break;
    }

    paths.push(...data.map((file) => `${userId}/${file.name}`));

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  if (paths.length > 0) {
    const { error: removeError } = await serviceClient.storage.from('ugc-photos').remove(paths);

    if (removeError) {
      return { error: removeError.message };
    }
  }

  const { error: rpcError } = await serviceClient.rpc('delete_account_data', {
    target_user_id: userId,
  });

  if (rpcError) {
    return { error: rpcError.message };
  }

  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);

  if (authError) {
    return { error: authError.message };
  }

  return { error: null };
}
