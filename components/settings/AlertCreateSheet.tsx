'use client';

import { useState } from 'react';
import { AlertCityChipSelector } from '@/components/settings/AlertCityChipSelector';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from '@/components/ui/toaster';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type AlertCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

const ALERT_SHEET_HEIGHT_CLASS = 'bottom-0 max-h-[85dvh]';

export function AlertCreateSheet({ open, onOpenChange, onCreated }: AlertCreateSheetProps) {
  const { messages } = useMessages();

  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState<ConsumerCityKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setKeyword('');
    setCity(null);
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
    if (!trimmedKeyword && city === null) {
      setError(messages.settings.alerts.validationRequired);
      return;
    }

    setSubmitting(true);
    try {
      const body: { keyword?: string; city?: ConsumerCityKey | null } = {};
      if (trimmedKeyword) body.keyword = trimmedKeyword;
      if (city !== null) body.city = city;

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
      <DrawerContent className={cn(ALERT_SHEET_HEIGHT_CLASS, 'pb-0')}>
        <DrawerHeader className="shrink-0 border-b border-outline-variant pb-space-md">
          <DrawerTitle className="text-h3 font-semibold">{messages.settings.alerts.createTitle}</DrawerTitle>
          <p className="text-body-md text-on-surface-variant">{messages.settings.alerts.createDescription}</p>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-space-md">
            <div className="flex flex-col gap-space-lg">
              <label className="flex flex-col gap-space-xs">
                <span className="text-label-md font-medium text-on-surface-variant">
                  {messages.settings.alerts.keywordLabel}
                </span>
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={messages.settings.alerts.keywordPlaceholder}
                  maxLength={100}
                  className="min-h-11 rounded border border-outline-variant bg-surface-container-lowest px-space-sm text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-on-surface focus:ring-1 focus:ring-outline"
                />
              </label>

              <div className="flex flex-col gap-space-sm">
                <span className="text-label-md font-medium text-on-surface-variant">
                  {messages.settings.alerts.cityLabel}
                </span>
                <AlertCityChipSelector value={city} onChange={setCity} />
                <p className="text-label-sm text-on-surface-variant">{messages.settings.alerts.cityHint}</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-outline-variant px-gutter py-space-md pb-[max(env(safe-area-inset-bottom,0px),var(--spacing-space-md))]">
            {error && (
              <p className="mb-space-sm text-label-sm text-error" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-space-sm">
              <DrawerClose asChild>
                <Button type="button" variant="secondary" className="min-h-11 flex-1">
                  {messages.settings.alerts.cancel}
                </Button>
              </DrawerClose>
              <Button type="submit" className="min-h-11 flex-1" disabled={submitting}>
                {submitting ? messages.settings.alerts.submitting : messages.settings.alerts.submit}
              </Button>
            </div>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
