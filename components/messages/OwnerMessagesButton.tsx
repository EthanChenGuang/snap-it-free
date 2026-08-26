'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';

type OwnerMessagesButtonProps = {
  listingId: string;
};

export function OwnerMessagesButton({ listingId }: OwnerMessagesButtonProps) {
  const { messages } = useMessages();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/messages/conversations?listingId=${encodeURIComponent(listingId)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          conversations: Array<{ id: string }>;
        };
        if (!cancelled) {
          setConversationId(data.conversations[0]?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (loading) return null;
  if (!conversationId) return null;

  return (
    <Button asChild variant="secondary" className="w-full rounded-lg">
      <Link href={`/messages/${conversationId}`}>{messages.inbox.viewMessages}</Link>
    </Button>
  );
}
