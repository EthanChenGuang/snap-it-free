import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/** D-113: unread in-app match count for BottomNav badge. */
export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from('alert_matches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
