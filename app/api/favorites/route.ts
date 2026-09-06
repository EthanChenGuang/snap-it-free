import { NextResponse } from 'next/server';
import { FavoriteListingIdSchema } from '@/lib/favorites/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { restErrorResponse } from '@/lib/supabase/rest-error';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_favorites')
    .select('listing_id')
    .eq('user_id', user.id);

  if (error) {
    return restErrorResponse(error);
  }

  const listingIds = (data ?? []).map((row) => row.listing_id as string);
  return NextResponse.json({ listingIds });
}

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

  const parsed = FavoriteListingIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('user_favorites').upsert(
    {
      user_id: user.id,
      listing_id: parsed.data.listingId,
    },
    { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
  );

  if (error) {
    return restErrorResponse(error);
  }

  return NextResponse.json({ ok: true, listingId: parsed.data.listingId });
}

export async function DELETE(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const listingId = new URL(request.url).searchParams.get('listingId');
  const parsed = FavoriteListingIdSchema.safeParse({ listingId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', parsed.data.listingId);

  if (error) {
    return restErrorResponse(error);
  }

  return NextResponse.json({ ok: true, listingId: parsed.data.listingId });
}
