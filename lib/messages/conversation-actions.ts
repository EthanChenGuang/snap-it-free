import {
  countRecentConversationsByBuyerFromDb,
  findConversationByListingAndBuyerFromDb,
  findConversationByListingFromDb,
  getActiveUgcListingForMessagingFromDb,
  getConversationPageDataFromDb,
  insertConversationFromDb,
  insertMessageFromDb,
  isConversationParticipantFromDb,
  listConversationsForUserFromDb,
  listMessagePreviewsForConversationsFromDb,
  listMessagesFromDb,
  listingHasOtherBuyerConversationFromDb,
} from '@/lib/messages/conversations-db';
import { isRestJwtError, isTransientRestError } from '@/lib/supabase/rest-error';
import { createClient } from '@/lib/supabase/server';
import { RateLimitError } from '@/lib/ugc/rate-limit';

const CONVERSATION_LIMIT = 5;
const CONVERSATION_WINDOW_MS = 60 * 60 * 1000;

type RestErrorLike = { message?: string; code?: string };

function shouldFallback(error: RestErrorLike | null | undefined): boolean {
  if (!error) return false;
  return (
    isRestJwtError(error.message, error.code) ||
    isTransientRestError(error.message, error.code) ||
    error.code === 'PGRST000'
  );
}

async function assertCanStartConversationFromDb(userId: string): Promise<void> {
  const since = new Date(Date.now() - CONVERSATION_WINDOW_MS).toISOString();
  const count = await countRecentConversationsByBuyerFromDb(userId, since);
  if (count >= CONVERSATION_LIMIT) {
    throw new RateLimitError('conversation');
  }
}

export type StartConversationResult =
  | { kind: 'existing'; id: string }
  | { kind: 'created'; id: string }
  | { kind: 'readOnly'; reason: 'fcfs' }
  | { kind: 'notFound' }
  | { kind: 'ownListing' };

export async function startConversationForListing(
  userId: string,
  listingId: string,
): Promise<StartConversationResult> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_user_id', userId)
    .maybeSingle();

  let existingId = existing?.id;
  if (shouldFallback(existingError) || (!existingId && existingError)) {
    const row = await findConversationByListingAndBuyerFromDb(listingId, userId);
    existingId = row?.id;
  }

  if (existingId) {
    return { kind: 'existing', id: existingId };
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, source, status, owner_user_id')
    .eq('id', listingId)
    .eq('source', 'ugc')
    .eq('status', 'active')
    .maybeSingle();

  let ownerUserId = listing?.owner_user_id ?? null;
  if (shouldFallback(listingError) || (!ownerUserId && listingError)) {
    const row = await getActiveUgcListingForMessagingFromDb(listingId);
    ownerUserId = row?.owner_user_id ?? null;
  }

  if (!ownerUserId) {
    return { kind: 'notFound' };
  }

  if (ownerUserId === userId) {
    return { kind: 'ownListing' };
  }

  const { data: fcfsBlocked, error: fcfsError } = await supabase.rpc(
    'listing_has_other_buyer_conversation',
    { p_listing_id: listingId, p_buyer_id: userId },
  );

  let blocked = fcfsBlocked === true;
  if (shouldFallback(fcfsError)) {
    blocked = await listingHasOtherBuyerConversationFromDb(listingId, userId);
  } else if (fcfsError) {
    throw new Error(fcfsError.message);
  }

  if (blocked) {
    return { kind: 'readOnly', reason: 'fcfs' };
  }

  try {
    const since = new Date(Date.now() - CONVERSATION_WINDOW_MS).toISOString();
    const { count, error: rateError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_user_id', userId)
      .gte('created_at', since);

    if (shouldFallback(rateError)) {
      await assertCanStartConversationFromDb(userId);
    } else if (rateError) {
      throw new Error(rateError.message);
    } else if ((count ?? 0) >= CONVERSATION_LIMIT) {
      throw new RateLimitError('conversation');
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    await assertCanStartConversationFromDb(userId);
  }

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_user_id: userId,
      seller_user_id: ownerUserId,
    })
    .select('id')
    .maybeSingle();

  if (!insertError && created?.id) {
    return { kind: 'created', id: created.id };
  }

  if (insertError?.code === '23505' || shouldFallback(insertError)) {
    const raced =
      (await findConversationByListingAndBuyerFromDb(listingId, userId)) ??
      (await findConversationByListingFromDb(listingId));

    if (raced?.buyer_user_id === userId) {
      return { kind: 'existing', id: raced.id };
    }
    if (raced) {
      return { kind: 'readOnly', reason: 'fcfs' };
    }
  }

  if (shouldFallback(insertError)) {
    const id = await insertConversationFromDb(listingId, userId, ownerUserId);
    if (id) {
      return { kind: 'created', id };
    }

    const raced =
      (await findConversationByListingAndBuyerFromDb(listingId, userId)) ??
      (await findConversationByListingFromDb(listingId));

    if (raced?.buyer_user_id === userId) {
      return { kind: 'existing', id: raced.id };
    }
    if (raced) {
      return { kind: 'readOnly', reason: 'fcfs' };
    }
  }

  if (insertError) {
    throw new Error(insertError.message);
  }

  throw new Error('Failed to create conversation');
}

export type InboxConversationResult = {
  id: string;
  listingId: string;
  role: 'buyer' | 'seller';
  createdAt: string;
  listing: {
    id: string;
    title: string;
    photoUrl: string;
    status: string;
  };
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function listConversationsForUser(
  userId: string,
  listingId?: string,
): Promise<InboxConversationResult[]> {
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
    .or(`buyer_user_id.eq.${userId},seller_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (listingId) {
    query = query.eq('listing_id', listingId);
  }

  const { data: conversations, error } = await query;

  if (!error && conversations) {
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
      } | Array<{
        id: string;
        title: string;
        photo_url: string | null;
        status: string;
      }> | null;
    };

    const rows = (conversations as ConversationRow[]).map((row) => ({
      ...row,
      listings: Array.isArray(row.listings) ? row.listings[0] ?? null : row.listings,
    }));

    if (rows.length === 0) return [];

    const conversationIds = rows.map((row) => row.id);
    const { data: messageRows, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id, body, created_at, sender_id')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (messagesError && !shouldFallback(messagesError)) {
      throw new Error(messagesError.message);
    }

    const latestMap = new Map<
      string,
      { body: string; created_at: string; sender_id: string }
    >();
    for (const message of messageRows ?? []) {
      if (!latestMap.has(message.conversation_id)) {
        latestMap.set(message.conversation_id, message);
      }
    }

    return rows
      .filter((row) => row.listings)
      .map((row) => {
        const lastMessage = latestMap.get(row.id) ?? null;
        return {
          id: row.id,
          listingId: row.listing_id,
          role: row.buyer_user_id === userId ? ('buyer' as const) : ('seller' as const),
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
  }

  if (!shouldFallback(error)) {
    throw new Error(error?.message ?? 'Failed to list conversations');
  }

  const rows = await listConversationsForUserFromDb(userId, listingId);
  if (rows.length === 0) return [];

  const previews = await listMessagePreviewsForConversationsFromDb(rows.map((row) => row.id));
  const latestMap = new Map(previews.map((message) => [message.conversation_id, message]));

  return rows
    .map((row) => {
      const lastMessage = latestMap.get(row.id) ?? null;
      return {
        id: row.id,
        listingId: row.listing_id,
        role: row.buyer_user_id === userId ? ('buyer' as const) : ('seller' as const),
        createdAt: toIso(row.created_at),
        listing: {
          id: row.listing_id,
          title: row.listing_title,
          photoUrl: row.listing_photo_url ?? '',
          status: row.listing_status,
        },
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: toIso(lastMessage.created_at),
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
}

export async function listConversationMessages(
  userId: string,
  conversationId: string,
  since?: string | null,
) {
  const supabase = await createClient();

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id, buyer_user_id, seller_user_id')
    .eq('id', conversationId)
    .maybeSingle();

  let allowed = Boolean(
    conversation &&
      (conversation.buyer_user_id === userId || conversation.seller_user_id === userId),
  );

  if (shouldFallback(conversationError) || (!conversation && conversationError)) {
    allowed = await isConversationParticipantFromDb(conversationId, userId);
  }

  if (!allowed) {
    return null;
  }

  let query = supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data: messages, error } = await query;

  if (!error && messages) {
    return messages;
  }

  if (!shouldFallback(error)) {
    throw new Error(error?.message ?? 'Failed to load messages');
  }

  return listMessagesFromDb(conversationId, since);
}

export type ConversationPageData = {
  id: string;
  listing: {
    id: string;
    title: string;
    photo_url: string;
  };
};

export async function getConversationPageData(
  conversationId: string,
  userId: string,
): Promise<ConversationPageData | null> {
  const supabase = await createClient();

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(
      `
      id,
      buyer_user_id,
      seller_user_id,
      listings (id, title, photo_url, status)
    `,
    )
    .eq('id', conversationId)
    .maybeSingle();

  if (!error && conversation) {
    if (
      conversation.buyer_user_id !== userId &&
      conversation.seller_user_id !== userId
    ) {
      return null;
    }

    const listingRaw = conversation.listings;
    const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as {
      id: string;
      title: string;
      photo_url: string | null;
      status: string;
    } | null;

    if (!listing) {
      return null;
    }

    return {
      id: conversation.id,
      listing: {
        id: listing.id,
        title: listing.title,
        photo_url: listing.photo_url ?? '',
      },
    };
  }

  if (!shouldFallback(error)) {
    return null;
  }

  const row = await getConversationPageDataFromDb(conversationId, userId);
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      photo_url: row.listing_photo_url ?? '',
    },
  };
}

export async function sendConversationMessage(
  userId: string,
  conversationId: string,
  body: string,
) {
  const supabase = await createClient();

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id, buyer_user_id, seller_user_id')
    .eq('id', conversationId)
    .maybeSingle();

  let allowed = Boolean(
    conversation &&
      (conversation.buyer_user_id === userId || conversation.seller_user_id === userId),
  );

  if (shouldFallback(conversationError) || (!conversation && conversationError)) {
    allowed = await isConversationParticipantFromDb(conversationId, userId);
  }

  if (!allowed) {
    return null;
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body,
    })
    .select('id, sender_id, body, created_at')
    .single();

  if (!error && message) {
    return message;
  }

  if (!shouldFallback(error)) {
    throw new Error(error?.message ?? 'Failed to send message');
  }

  return insertMessageFromDb(conversationId, userId, body);
}
