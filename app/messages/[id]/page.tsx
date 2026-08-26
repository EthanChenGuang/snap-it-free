import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { ConversationPageClient } from '@/components/messages/ConversationPageClient';
import { createClient } from '@/lib/supabase/server';

const conversationIdSchema = z.string().uuid();

type ConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;
  const parsed = conversationIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/messages');
  }

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
    .eq('id', parsed.data)
    .maybeSingle();

  if (error || !conversation) {
    notFound();
  }

  if (conversation.buyer_user_id !== user.id && conversation.seller_user_id !== user.id) {
    notFound();
  }

  const listingRaw = conversation.listings;
  const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as {
    id: string;
    title: string;
    photo_url: string | null;
    status: string;
  } | null;

  if (!listing) {
    notFound();
  }

  return (
    <main className="app-shell flex min-h-full flex-col">
      <ConversationPageClient
        conversationId={conversation.id}
        listing={{
          id: listing.id,
          title: listing.title,
          photo_url: listing.photo_url ?? '',
        }}
        readOnly={false}
      />
    </main>
  );
}
