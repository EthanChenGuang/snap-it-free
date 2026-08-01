import type { SupabaseClient } from '@supabase/supabase-js';

const POST_LIMIT = 3;
const POST_WINDOW_MS = 24 * 60 * 60 * 1000;
const CONVERSATION_LIMIT = 5;
const CONVERSATION_WINDOW_MS = 60 * 60 * 1000;

export class RateLimitError extends Error {
  readonly kind: 'post' | 'conversation';

  constructor(kind: 'post' | 'conversation') {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.kind = kind;
  }
}

export async function assertCanPost(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const since = new Date(Date.now() - POST_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'ugc')
    .eq('owner_user_id', userId)
    .gte('posted_at', since);

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= POST_LIMIT) {
    throw new RateLimitError('post');
  }
}

export async function assertCanStartConversation(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const since = new Date(Date.now() - CONVERSATION_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('buyer_user_id', userId)
    .gte('created_at', since);

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= CONVERSATION_LIMIT) {
    throw new RateLimitError('conversation');
  }
}
