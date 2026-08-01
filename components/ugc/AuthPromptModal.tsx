'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { messages } from '@/messages/it';

type AuthPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
};

export function AuthPromptModal({ open, onOpenChange, redirectTo = '/post' }: AuthPromptModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    const supabase = createClient();
    const redirectToUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectToUrl },
    });

    setStatus(error ? 'error' : 'sent');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.auth.modalTitle}</DialogTitle>
          <DialogDescription>{messages.auth.modalDescription}</DialogDescription>
        </DialogHeader>

        {status === 'sent' ? (
          <p className="text-body-md text-on-surface">{messages.auth.checkEmail}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
            <label className="flex flex-col gap-space-xs">
              <span className="text-label-md text-on-surface-variant">{messages.auth.emailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={messages.auth.emailPlaceholder}
                className="rounded border border-outline-variant bg-surface px-space-sm py-space-sm text-body-md text-on-surface outline-none focus:border-primary"
                required
              />
            </label>
            {status === 'error' && (
              <p className="text-label-sm text-error">{messages.auth.sendError}</p>
            )}
            <Button type="submit" disabled={status === 'sending'} className="w-full">
              {status === 'sending' ? messages.auth.sending : messages.auth.sendLink}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
