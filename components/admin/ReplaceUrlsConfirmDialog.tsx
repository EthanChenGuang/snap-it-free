'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RECOMMENDED_SEED_COUNT } from '@/lib/admin/subito-recommended-seed';

type ReplaceUrlsConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCount: number;
  onConfirmReplace: () => void;
};

export function ReplaceUrlsConfirmDialog({
  open,
  onOpenChange,
  currentCount,
  onConfirmReplace,
}: ReplaceUrlsConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    // Overlay dismiss = cancel — no replace (UI-SPEC E2 backstop).
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gap-6 border-outline-variant bg-surface p-6 shadow-none [&>button]:hidden"
        onPointerDownOutside={(event) => {
          event.preventDefault();
          onOpenChange(false);
        }}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle className="text-[24px] font-semibold">Replace target URLs?</DialogTitle>
          <DialogDescription className="text-[15px] text-on-surface-variant">
            Replace current {currentCount} URLs with the recommended {RECOMMENDED_SEED_COUNT}-URL seed
            {RECOMMENDED_SEED_COUNT === 34
              ? ' (Venezia + Padova × all regalo categories)'
              : ' (Venezia × all regalo categories)'}
            ?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded border border-outline px-4 py-2 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            保留当前 URL
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmReplace();
              onOpenChange(false);
            }}
            className="rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:opacity-90"
          >
            Replace URLs
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
