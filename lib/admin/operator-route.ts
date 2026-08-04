import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/admin/require-operator';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export async function requireOperatorSession() {
  const user = await requireAuth();
  if (!user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const supabase = await createClient();
  const allowed = await requireOperator(supabase, user.email);
  if (!allowed) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user };
}
