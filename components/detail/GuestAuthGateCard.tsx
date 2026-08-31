'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type GuestAuthGateCardProps = {
  redirectTo: string;
  id?: string;
  onClose: () => void;
  className?: string;
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
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

const cardSpring = { type: 'spring' as const, stiffness: 380, damping: 30 };

export { cardSpring };

/** Apple HIG light frosted-glass auth card for guest listing detail. */
export function GuestAuthGateCard({ redirectTo, id, onClose, className }: GuestAuthGateCardProps) {
  const { messages } = useMessages();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const isAuthBusy = oauthStatus === 'loading' || status === 'sending';

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
    <div
      id={id}
      role="dialog"
      aria-labelledby="guest-auth-gate-title"
      aria-describedby="guest-auth-gate-subtitle"
      className={cn(
        'relative mx-auto w-full max-w-sm rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur-2xl',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={messages.auth.guestGateClose}
        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100/80 text-zinc-500 transition-colors hover:bg-zinc-200"
      >
        <span className="material-symbols-outlined text-label-md leading-none" aria-hidden="true">
          close
        </span>
      </button>

      {status === 'sent' ? (
        <p className="pt-2 text-body-md text-zinc-900">{messages.auth.checkEmail}</p>
      ) : (
        <>
          <div className="pr-8">
            <h2
              id="guest-auth-gate-title"
              className="text-xl font-bold tracking-tight text-zinc-900"
            >
              {messages.auth.guestGateTitle}
            </h2>
            <p id="guest-auth-gate-subtitle" className="mb-5 mt-1 text-label-sm text-zinc-500">
              {messages.auth.guestGateSubtitle}
            </p>
          </div>

          <button
            type="button"
            disabled={!APPLE_OAUTH_ENABLED || isAuthBusy}
            title={APPLE_OAUTH_ENABLED ? undefined : messages.auth.appleSignInDisabled}
            onClick={() => APPLE_OAUTH_ENABLED && handleOAuth('apple')}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-label-md font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            <AppleIcon />
            {messages.auth.appleSignIn}
          </button>

          <button
            type="button"
            disabled={isAuthBusy}
            onClick={() => handleOAuth('google')}
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-label-md font-medium text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
          >
            <GoogleIcon />
            {messages.auth.googleSignIn}
          </button>

          {oauthStatus === 'error' && (
            <p className="mt-2 text-label-sm text-error">{messages.auth.oauthError}</p>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center uppercase tracking-wider text-label-sm text-zinc-400">
              <span className="bg-transparent px-2 backdrop-blur-sm">
                {messages.auth.guestGateEmailDivider}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative flex w-full items-center">
            <label htmlFor="guest-gate-email" className="sr-only">
              {messages.auth.emailLabel}
            </label>
            <input
              id="guest-gate-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={messages.auth.emailPlaceholder}
              disabled={isAuthBusy}
              autoComplete="email"
              inputMode="email"
              className="h-11 w-full rounded-xl border border-zinc-200/80 bg-zinc-100/80 py-0 pl-3.5 pr-11 text-body-md text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
              required
            />
            <button
              type="submit"
              disabled={isAuthBusy}
              aria-label={messages.auth.sendLink}
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-label-md leading-none" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>

          {status === 'error' && (
            <p className="mt-2 text-label-sm text-error">{messages.auth.sendError}</p>
          )}
        </>
      )}
    </div>
  );
}
