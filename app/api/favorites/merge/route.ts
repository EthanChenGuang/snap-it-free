import { NextResponse } from 'next/server';
import { MergeFavoritesSchema } from '@/lib/favorites/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { restErrorResponse } from '@/lib/supabase/rest-error';
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

  const parsed = MergeFavoritesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingIds } = parsed.data;
  if (listingIds.length === 0) {
    return NextResponse.json({ ok: true, merged: 0 });
  }

  const supabase = await createClient();
  const rows = listingIds.map((listingId) => ({
    user_id: user.id,
    listing_id: listingId,
  }));

  const { error } = await supabase
    .from('user_favorites')
    .upsert(rows, { onConflict: 'user_id,listing_id', ignoreDuplicates: true });

  if (error) {
    return restErrorResponse(error);
  }

  return NextResponse.json({ ok: true, merged: listingIds.length });
}
