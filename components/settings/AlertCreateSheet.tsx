'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ZoneChipSelector } from '@/components/settings/ZoneChipSelector';
import { toast } from '@/components/ui/toaster';
import type { VeniceZone } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type AlertCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AlertCreateSheet({ open, onOpenChange, onCreated }: AlertCreateSheetProps) {
  const { messages } = useMessages();

  const [keyword, setKeyword] = useState('');
  const [zone, setZone] = useState<VeniceZone | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setKeyword('');
    setZone(null);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword && zone === null) {
      setError(messages.settings.alerts.validationRequired);
      return;
    }

    setSubmitting(true);
    try {
      const body: { keyword?: string; zone?: VeniceZone | null } = {};
      if (trimmedKeyword) body.keyword = trimmedKeyword;
      if (zone !== null) body.zone = zone;

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: string };

      if (response.status === 401) {
        setError(messages.settings.alerts.signInPrompt);
        return;
      }

      if (!response.ok) {
        setError(
          typeof payload.error === 'string'
            ? payload.error
            : messages.settings.alerts.createError,
        );
        return;
      }

      toast(messages.settings.alerts.createSuccess);
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch {
      setError(messages.settings.alerts.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="pb-space-xl">
        <DrawerHeader>
          <DrawerTitle>{messages.settings.alerts.createTitle}</DrawerTitle>
          <p className="text-body-md text-secondary">{messages.settings.alerts.createDescription}</p>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg px-gutter pb-space-lg">
          <label className="flex flex-col gap-space-xs">
            <span className="text-label-md text-on-surface-variant">
              {messages.settings.alerts.keywordLabel}
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={messages.settings.alerts.keywordPlaceholder}
              maxLength={100}
              className="rounded border border-outline-variant bg-surface px-space-sm py-space-sm text-body-md text-on-surface outline-none focus:border-primary"
            />
          </label>

          <div className="flex flex-col gap-space-xs">
            <span className="text-label-md text-on-surface-variant">
              {messages.settings.alerts.zoneLabel}
            </span>
            <ZoneChipSelector value={zone} onChange={setZone} />
            <p className="text-label-sm text-secondary">{messages.settings.alerts.zoneHint}</p>
          </div>

          {error && <p className="text-label-sm text-error">{error}</p>}

          <div className="flex gap-space-sm">
            <DrawerClose asChild>
              <Button type="button" variant="secondary" className="flex-1">
                {messages.settings.alerts.cancel}
              </Button>
            </DrawerClose>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? messages.settings.alerts.submitting : messages.settings.alerts.submit}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
