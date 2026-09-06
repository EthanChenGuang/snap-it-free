import { getListingsPool } from '@/lib/supabase/postgres';

export type MessagingListingRow = {
  id: string;
  owner_user_id: string;
  source: string;
  status: string;
};

export type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  created_at: Date | string;
};

export type ConversationWithListingRow = ConversationRow & {
  listing_title: string;
  listing_photo_url: string | null;
  listing_status: string;
};

export type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: Date | string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function findConversationByListingAndBuyerFromDb(
  listingId: string,
  buyerUserId: string,
): Promise<{ id: string; buyer_user_id: string } | null> {
  const { rows } = await getListingsPool().query<{ id: string; buyer_user_id: string }>(
    `select id, buyer_user_id
     from public.conversations
     where listing_id = $1::uuid
       and buyer_user_id = $2::uuid
     limit 1`,
    [listingId, buyerUserId],
  );
  return rows[0] ?? null;
}

export async function findConversationByListingFromDb(
  listingId: string,
): Promise<{ id: string; buyer_user_id: string } | null> {
  const { rows } = await getListingsPool().query<{ id: string; buyer_user_id: string }>(
    `select id, buyer_user_id
     from public.conversations
     where listing_id = $1::uuid
     limit 1`,
    [listingId],
  );
  return rows[0] ?? null;
}

export async function getActiveUgcListingForMessagingFromDb(
  listingId: string,
): Promise<MessagingListingRow | null> {
  const { rows } = await getListingsPool().query<MessagingListingRow>(
    `select id, owner_user_id, source, status
     from public.listings
     where id = $1::uuid
       and source = 'ugc'
       and status = 'active'
     limit 1`,
    [listingId],
  );
  return rows[0] ?? null;
}

export async function listingHasOtherBuyerConversationFromDb(
  listingId: string,
  buyerUserId: string,
): Promise<boolean> {
  const { rows } = await getListingsPool().query<{ blocked: boolean }>(
    `select public.listing_has_other_buyer_conversation($1::uuid, $2::uuid) as blocked`,
    [listingId, buyerUserId],
  );
  return rows[0]?.blocked === true;
}

export async function countRecentConversationsByBuyerFromDb(
  buyerUserId: string,
  sinceIso: string,
): Promise<number> {
  const { rows } = await getListingsPool().query<{ n: number }>(
    `select count(*)::int as n
     from public.conversations
     where buyer_user_id = $1::uuid
       and created_at >= $2::timestamptz`,
    [buyerUserId, sinceIso],
  );
  return rows[0]?.n ?? 0;
}

export async function insertConversationFromDb(
  listingId: string,
  buyerUserId: string,
  sellerUserId: string,
): Promise<string | null> {
  const { rows } = await getListingsPool().query<{ id: string }>(
    `insert into public.conversations (listing_id, buyer_user_id, seller_user_id)
     values ($1::uuid, $2::uuid, $3::uuid)
     returning id`,
    [listingId, buyerUserId, sellerUserId],
  );
  return rows[0]?.id ?? null;
}

export async function listConversationsForUserFromDb(
  userId: string,
  listingId?: string,
): Promise<ConversationWithListingRow[]> {
  const params: unknown[] = [userId];
  let listingFilter = '';

  if (listingId) {
    params.push(listingId);
    listingFilter = `and c.listing_id = $2::uuid`;
  }

  const { rows } = await getListingsPool().query<ConversationWithListingRow>(
    `select
       c.id,
       c.listing_id,
       c.buyer_user_id,
       c.seller_user_id,
       c.created_at,
       l.title as listing_title,
       l.photo_url as listing_photo_url,
       l.status as listing_status
     from public.conversations c
     inner join public.listings l on l.id = c.listing_id
     where (c.buyer_user_id = $1::uuid or c.seller_user_id = $1::uuid)
       ${listingFilter}
     order by c.created_at desc`,
    params,
  );

  return rows;
}

export async function listMessagePreviewsForConversationsFromDb(
  conversationIds: string[],
): Promise<Array<MessageRow & { conversation_id: string }>> {
  if (conversationIds.length === 0) return [];

  const { rows } = await getListingsPool().query<MessageRow & { conversation_id: string }>(
    `select distinct on (conversation_id)
       conversation_id, id, sender_id, body, created_at
     from public.messages
     where conversation_id = any($1::uuid[])
     order by conversation_id, created_at desc`,
    [conversationIds],
  );

  return rows.map((row) => ({
    ...row,
    created_at: toIso(row.created_at),
  }));
}

export async function isConversationParticipantFromDb(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { rows } = await getListingsPool().query<{ ok: boolean }>(
    `select exists (
       select 1
       from public.conversations
       where id = $1::uuid
         and (buyer_user_id = $2::uuid or seller_user_id = $2::uuid)
     ) as ok`,
    [conversationId, userId],
  );
  return rows[0]?.ok === true;
}

export type ConversationPageDbRow = {
  id: string;
  buyer_user_id: string;
  seller_user_id: string;
  listing_id: string;
  listing_title: string;
  listing_photo_url: string | null;
  listing_status: string;
};

export async function getConversationPageDataFromDb(
  conversationId: string,
  userId: string,
): Promise<ConversationPageDbRow | null> {
  const { rows } = await getListingsPool().query<ConversationPageDbRow>(
    `select
       c.id,
       c.buyer_user_id,
       c.seller_user_id,
       l.id as listing_id,
       l.title as listing_title,
       l.photo_url as listing_photo_url,
       l.status as listing_status
     from public.conversations c
     inner join public.listings l on l.id = c.listing_id
     where c.id = $1::uuid
       and (c.buyer_user_id = $2::uuid or c.seller_user_id = $2::uuid)
     limit 1`,
    [conversationId, userId],
  );
  return rows[0] ?? null;
}

export async function listMessagesFromDb(
  conversationId: string,
  since?: string | null,
): Promise<MessageRow[]> {
  const params: unknown[] = [conversationId];
  let sinceFilter = '';

  if (since) {
    params.push(since);
    sinceFilter = `and created_at > $2::timestamptz`;
  }

  const { rows } = await getListingsPool().query<MessageRow>(
    `select id, sender_id, body, created_at
     from public.messages
     where conversation_id = $1::uuid
       ${sinceFilter}
     order by created_at asc`,
    params,
  );

  return rows.map((row) => ({
    ...row,
    created_at: toIso(row.created_at),
  }));
}

export async function insertMessageFromDb(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<MessageRow | null> {
  const { rows } = await getListingsPool().query<MessageRow>(
    `insert into public.messages (conversation_id, sender_id, body)
     values ($1::uuid, $2::uuid, $3)
     returning id, sender_id, body, created_at`,
    [conversationId, senderId, body],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    created_at: toIso(row.created_at),
  };
}
