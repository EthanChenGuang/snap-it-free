import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CreateConversationSchema } from '@/lib/messages/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { assertCanStartConversation, RateLimitError } from '@/lib/ugc/rate-limit';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

const ListConversationsQuerySchema = z.object({
  listingId: z.string().uuid().optional(),
});

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  created_at: string;
  listings: {
    id: string;
    title: string;
    photo_url: string | null;
    status: string;
  } | null;
};

type MessagePreview = {
  conversation_id: string;
  body: string;
  created_at: string;
  sender_id: string;
};

function latestMessageByConversation(messagesList: MessagePreview[]) {
  const map = new Map<string, MessagePreview>();
  for (const message of messagesList) {
    const existing = map.get(message.conversation_id);
    if (!existing || new Date(message.created_at) > new Date(existing.created_at)) {
      map.set(message.conversation_id, message);
    }
  }
  return map;
}

export async function GET(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = ListConversationsQuerySchema.safeParse({
    listingId: url.searchParams.get('listingId') ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from('conversations')
    .select(
      `
      id,
      listing_id,
      buyer_user_id,
      seller_user_id,
      created_at,
      listings (id, title, photo_url, status)
    `,
    )
    .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (parsedQuery.data.listingId) {
    query = query.eq('listing_id', parsedQuery.data.listingId);
  }

  const { data: conversations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (conversations ?? []).map((row) => ({
    ...row,
    listings: Array.isArray(row.listings) ? row.listings[0] ?? null : row.listings,
  })) as ConversationRow[];
  if (rows.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const conversationIds = rows.map((row) => row.id);
  const { data: messageRows, error: messagesError } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at, sender_id')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const latestMap = latestMessageByConversation((messageRows ?? []) as MessagePreview[]);

  const result = rows
    .filter((row) => row.listings)
    .map((row) => {
      const lastMessage = latestMap.get(row.id) ?? null;
      return {
        id: row.id,
        listingId: row.listing_id,
        role: row.buyer_user_id === user.id ? ('buyer' as const) : ('seller' as const),
        createdAt: row.created_at,
        listing: {
          id: row.listings!.id,
          title: row.listings!.title,
          photoUrl: row.listings!.photo_url ?? '',
          status: row.listings!.status,
        },
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: lastMessage.created_at,
              senderId: lastMessage.sender_id,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  return NextResponse.json({ conversations: result });
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
