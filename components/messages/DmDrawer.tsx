'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from '@/components/ui/toaster';
import { ConversationThread } from '@/components/messages/ConversationThread';
import { useConversationThread } from '@/lib/messages/useConversationThread';
import { useMessages } from '@/lib/i18n/useMessages';

type DmDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    photo_url: string;
  };
  conversationId: string | null;
  readOnly: boolean;
  onConversationReady: (id: string, readOnly: boolean) => void;
};

export function DmDrawer({
  open,
  onOpenChange,
  listing,
  conversationId,
  readOnly,
  onConversationReady,
}: DmDrawerProps) {
  const { messages } = useMessages();
  const { messagesList, userId, loading, setLoading, sendMessage } = useConversationThread({
    conversationId,
    readOnly,
    enabled: open && Boolean(conversationId),
  });
  const startAttemptedRef = useRef(false);

  const startConversation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      });

      const data = (await res.json()) as {
        id?: string;
        readOnly?: boolean;
        reason?: string;
        error?: string;
      };

      if (!res.ok) {
        toast(data.error ?? messages.dm.sendError);
        return;
      }

      if (data.readOnly) {
        onConversationReady('', true);
        return;
      }

      if (data.id) {
        onConversationReady(data.id, false);
      }
    } catch {
      toast(messages.dm.sendError);
    } finally {
      setLoading(false);
    }
  }, [listing.id, onConversationReady, messages.dm.sendError, setLoading]);

  useEffect(() => {
    if (!open) {
      startAttemptedRef.current = false;
      return;
    }

    if (open && !conversationId && !readOnly && !loading && !startAttemptedRef.current) {
      startAttemptedRef.current = true;
      void startConversation();
    }
  }, [open, conversationId, readOnly, loading, startConversation]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="border-b border-outline-variant pb-space-sm">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-h3 font-semibold">{messages.dm.drawerTitle}</DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                aria-label={messages.dm.close}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ConversationThread
          listing={listing}
          conversationId={conversationId}
          readOnly={readOnly}
          loading={loading}
          messagesList={messagesList}
          userId={userId}
          onSend={sendMessage}
          variant="drawer"
          showInboxLink={Boolean(conversationId)}
        />
      </DrawerContent>
    </Drawer>
  );
}
