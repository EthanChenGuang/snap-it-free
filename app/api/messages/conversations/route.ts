import { NextResponse } from 'next/server';
import { CreateConversationSchema } from '@/lib/messages/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { assertCanStartConversation, RateLimitError } from '@/lib/ugc/rate-limit';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

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

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId } = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, existing: true });
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, source, status, owner_user_id')
    .eq('id', listingId)
    .eq('source', 'ugc')
    .eq('status', 'active')
    .maybeSingle();

  if (listingError) {
    return NextResponse.json({ error: listingError.message }, { status: 500 });
  }

  if (!listing?.owner_user_id) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.owner_user_id === user.id) {
    return NextResponse.json({ error: 'Cannot message your own listing' }, { status: 422 });
  }

  const { data: fcfsBlocked, error: fcfsError } = await supabase.rpc(
    'listing_has_other_buyer_conversation',
    { p_listing_id: listingId, p_buyer_id: user.id },
  );

  if (fcfsError) {
    return NextResponse.json({ error: fcfsError.message }, { status: 500 });
  }

  if (fcfsBlocked === true) {
    return NextResponse.json({ readOnly: true, reason: 'fcfs' });
  }

  try {
    await assertCanStartConversation(supabase, user.id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: messages.dm.rateLimit }, { status: 429 });
    }
    throw error;
  }

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_user_id: user.id,
      seller_user_id: listing.owner_user_id,
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('conversations')
        .select('id, buyer_user_id')
        .eq('listing_id', listingId)
        .maybeSingle();

      if (raced?.buyer_user_id === user.id) {
        return NextResponse.json({ id: raced.id, existing: true });
      }

      if (raced) {
        return NextResponse.json({ readOnly: true, reason: 'fcfs' });
      }
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (!created) {
    const { data: raced } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_user_id', user.id)
      .maybeSingle();

    if (raced) {
      return NextResponse.json({ id: raced.id, existing: true });
    }
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
