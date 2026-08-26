'use client';

import { AuthPromptForm } from '@/components/ugc/AuthPromptForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMessages } from '@/lib/i18n/useMessages';

type AuthPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Post-auth redirect path (same-origin). Defaults to `/post`.
   * Gate call sites should pass action-specific paths, e.g. `/favorites` or
   * `/settings?tab=alerts` (D-93).
   */
  redirectTo?: string;
  /**
   * Override default modal title for action-specific gates (D-93).
   * e.g. `messages.auth.favoriteTitle` for favorites, `messages.auth.alertTitle` for alerts.
   */
  modalTitle?: string;
};

export function AuthPromptModal({
  open,
  onOpenChange,
  redirectTo = '/post',
  modalTitle,
}: AuthPromptModalProps) {
  const { messages } = useMessages();

  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDown={stopBubble} onClick={stopBubble}>
        <DialogHeader>
          <DialogTitle>{modalTitle ?? messages.auth.modalTitle}</DialogTitle>
          <DialogDescription>{messages.auth.modalDescription}</DialogDescription>
        </DialogHeader>
        <AuthPromptForm redirectTo={redirectTo} />
      </DialogContent>
    </Dialog>
  );
}
