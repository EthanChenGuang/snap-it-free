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
  /** Post-auth redirect path (same-origin). Defaults to `/post`. */
  redirectTo?: string;
};

const APPLE_OAUTH_ENABLED = process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true';

function buildRedirectToUrl(redirectTo: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function AuthPromptModal({ open, onOpenChange, redirectTo = '/post' }: AuthPromptModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthStatus('loading');
    const supabase = createClient();
    const redirectToUrl = buildRedirectToUrl(redirectTo);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectToUrl },
    });

    if (error) {
      setOauthStatus('error');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    const supabase = createClient();
    const redirectToUrl = buildRedirectToUrl(redirectTo);
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
          <div className="flex flex-col gap-space-md">
            <div className="flex flex-col gap-space-sm">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={oauthStatus === 'loading'}
                onClick={() => handleOAuth('google')}
              >
                <GoogleIcon />
                {messages.auth.googleSignIn}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={!APPLE_OAUTH_ENABLED || oauthStatus === 'loading'}
                title={APPLE_OAUTH_ENABLED ? undefined : messages.auth.appleSignInDisabled}
                onClick={() => APPLE_OAUTH_ENABLED && handleOAuth('apple')}
              >
                <AppleIcon />
                {messages.auth.appleSignIn}
              </Button>
              {oauthStatus === 'error' && (
                <p className="text-label-sm text-error">{messages.auth.oauthError}</p>
              )}
            </div>

            <div className="flex items-center gap-space-sm">
              <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
              <span className="text-label-sm text-on-surface-variant">{messages.auth.orDivider}</span>
              <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
            </div>

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
