import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/** D-114: mark all unread matches for user+listing as read. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ listingId: string }> },
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listingId } = await context.params;
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('alert_matches')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .is('read_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
