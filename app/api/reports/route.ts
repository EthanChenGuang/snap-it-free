import { NextResponse } from 'next/server';
import { CreateReportSchema } from '@/lib/reports/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, reason } = parsed.data;
  const supabase = await createClient();

  const { error: insertError } = await supabase.from('listing_reports').insert({
    listing_id: listingId,
    reporter_user_id: user.id,
    reason,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ softMuted: true, listingId });
}
