import type { User } from '@supabase/supabase-js';
import { createClient } from './server';

export async function requireAuth(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
