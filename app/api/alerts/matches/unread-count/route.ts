import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { restErrorResponse } from '@/lib/supabase/rest-error';
import { withRestRetry } from '@/lib/supabase/rest-retry';
import { createClient } from '@/lib/supabase/server';

/** D-113: unread in-app match count for BottomNav badge. */
export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { count, error, status } = await withRestRetry(() =>
    supabase
      .from('alert_matches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  );

  if (error) {
    return restErrorResponse(error, { httpStatus: status });
  }

  return NextResponse.json({ count: count ?? 0 });
}
