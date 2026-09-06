import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { ConversationPageClient } from '@/components/messages/ConversationPageClient';
import { getConversationPageData } from '@/lib/messages/conversation-actions';
import { requireAuth } from '@/lib/supabase/auth';

const conversationIdSchema = z.string().uuid();

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MessageThreadPage({ params }: PageProps) {
  const { id } = await params;
  const parsed = conversationIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const user = await requireAuth();
  if (!user) {
    redirect('/messages');
  }

  const conversation = await getConversationPageData(parsed.data, user.id);
  if (!conversation) {
    notFound();
  }

  return (
    <main className="app-shell flex min-h-full flex-col">
      <ConversationPageClient
        conversationId={conversation.id}
        listing={conversation.listing}
        readOnly={false}
      />
    </main>
  );
}
