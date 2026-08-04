'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMessages } from '@/lib/i18n/useMessages';

type SafetyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
};

export function SafetyModal({ open, onOpenChange, onAcknowledge }: SafetyModalProps) {
  const { messages } = useMessages();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-on-surface">shield</span>
            {messages.safety.modalTitle}
          </DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col gap-space-sm text-body-md text-on-surface-variant">
          <li className="flex gap-space-sm">
            <span className="text-on-surface">•</span>
            {messages.safety.bullet1}
          </li>
          <li className="flex gap-space-sm">
            <span className="text-on-surface">•</span>
            {messages.safety.bullet2}
          </li>
          <li className="flex gap-space-sm">
            <span className="text-on-surface">•</span>
            {messages.safety.bullet3}
          </li>
        </ul>

        <div className="mt-space-md flex flex-col gap-space-sm">
          <Button type="button" className="w-full" onClick={onAcknowledge}>
            {messages.safety.acknowledge}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {messages.safety.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
