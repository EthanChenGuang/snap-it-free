import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listConversationsForUser,
  startConversationForListing,
} from '@/lib/messages/conversation-actions';
import { CreateConversationSchema } from '@/lib/messages/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { restErrorResponse } from '@/lib/supabase/rest-error';
import { RateLimitError } from '@/lib/ugc/rate-limit';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

const ListConversationsQuerySchema = z.object({
  listingId: z.string().uuid().optional(),
});

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

  try {
    const conversations = await listConversationsForUser(
      user.id,
      parsedQuery.data.listingId,
    );
    return NextResponse.json({ conversations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return restErrorResponse({ message });
  }
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

  try {
    const result = await startConversationForListing(user.id, parsed.data.listingId);

    switch (result.kind) {
      case 'existing':
        return NextResponse.json({ id: result.id, existing: true });
      case 'created':
        return NextResponse.json({ id: result.id }, { status: 201 });
      case 'readOnly':
        return NextResponse.json({ readOnly: true, reason: result.reason });
      case 'notFound':
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      case 'ownListing':
        return NextResponse.json({ error: 'Cannot message your own listing' }, { status: 422 });
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: messages.dm.rateLimit }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
