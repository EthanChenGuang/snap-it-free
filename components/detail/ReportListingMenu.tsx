'use client';

import { useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { REPORT_REASONS, type ReportReason } from '@/lib/reports/schemas';
import { addReportedId } from '@/lib/reports/storage';
import { createClient } from '@/lib/supabase/client';
import { messages } from '@/messages/it';

type ReportListingMenuProps = {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const REASON_LABELS: Record<ReportReason, string> = {
  already_taken: messages.report.reasonAlreadyTaken,
  not_free: messages.report.reasonNotFree,
  spam_or_scam: messages.report.reasonSpam,
};

export function ReportListingMenu({ listingId, open, onOpenChange }: ReportListingMenuProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const authRedirect = `/listing/${listingId}`;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedReason(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAuthOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, reason: selectedReason }),
      });

      if (response.status === 409) {
        toast(messages.report.duplicateToast);
        handleOpenChange(false);
        return;
      }

      if (!response.ok) {
        toast(messages.report.errorToast);
        return;
      }

      addReportedId(listingId);
      toast(messages.report.successToast);
      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.report.dialogTitle}</DialogTitle>
          </DialogHeader>

          <fieldset className="flex flex-col gap-space-sm">
            <legend className="sr-only">{messages.report.dialogTitle}</legend>
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex cursor-pointer items-center gap-space-md rounded border border-outline-variant px-space-md py-space-sm"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-body-md text-on-surface">{REASON_LABELS[reason]}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex justify-end gap-space-sm">
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
              {messages.report.close}
            </Button>
            <Button
              type="button"
              disabled={!selectedReason || submitting}
              onClick={() => void handleSubmit()}
            >
              {messages.report.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AuthPromptModal open={authOpen} onOpenChange={setAuthOpen} redirectTo={authRedirect} />
    </>
  );
}
