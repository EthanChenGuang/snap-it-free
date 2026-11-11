'use client';

import { useEffect, useState } from 'react';
import { pop } from '@/components/onboarding/pop-theme';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { cn } from '@/lib/utils';

type Phase = 'email' | 'sending' | 'code' | 'verifying';

/** Supabase refuses a second email to the same address within this many seconds. */
const RESEND_COOLDOWN_S = 60;

/** Seconds Supabase asks us to wait, from its 429 message ("...after 52 seconds"). */
function waitSeconds(error: { status?: number; message?: string }): number | null {
  if (error.status !== 429) return null;
  const match = error.message?.match(/(\d+)\s*second/);
  return match ? Number(match[1]) : RESEND_COOLDOWN_S;
}

/**
 * Email sign-in that works across browsers: we send the usual magic-link email and also accept the
 * one-time code from it. The link alone fails when it opens in another browser (PKCE verifier lives in
 * the browser that asked — e.g. an iPhone home-screen PWA vs Safari); the code does not.
 * Needs `{{ .Token }}` in the Supabase "Magic Link" email template for the code to appear.
 */
export function EmailCodeSignIn({
  emailRedirectTo,
  onBeforeSend,
  onSignedIn,
  testIdPrefix = 'email-code',
}: {
  /** Where the emailed link lands if the user taps it instead of typing the code. */
  emailRedirectTo: string;
  onBeforeSend?: () => void;
  onSignedIn: () => void;
  testIdPrefix?: string;
}) {
  const { messages } = useMessages();
  const copy = messages.emailCode;
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The address the last email went to, and when we may send to it again.
  const [lastSent, setLastSent] = useState<{ email: string; resendAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const waitLeft = lastSent ? Math.max(0, Math.ceil((lastSent.resendAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!lastSent || lastSent.resendAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lastSent]);

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !getSupabaseEnv()) {
      setError(copy.sendError);
      return;
    }
    const cooling = lastSent !== null && lastSent.resendAt > Date.now();
    if (cooling && lastSent.email.toLowerCase() === trimmed.toLowerCase()) {
      // Same address again within the cooldown: the email is already on its way, so just go back to the code.
      setError(null);
      setPhase('code');
      return;
    }
    onBeforeSend?.();
    setError(null);
    setPhase('sending');
    try {
      const { error: sendError } = await createClient().auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo },
      });
      if (sendError) {
        const wait = waitSeconds(sendError);
        if (wait !== null) {
          setLastSent({ email: trimmed, resendAt: Date.now() + wait * 1000 });
          setNow(Date.now());
          setError(copy.waitError(wait));
        } else {
          setError(copy.sendError);
        }
        setPhase(phase === 'code' ? 'code' : 'email');
      } else {
        setLastSent({ email: trimmed, resendAt: Date.now() + RESEND_COOLDOWN_S * 1000 });
        setNow(Date.now());
        setCode('');
        setPhase('code');
      }
    } catch {
      setError(copy.sendError);
      setPhase('email');
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = code.replace(/\s+/g, '');
    if (!/^\d{6,10}$/.test(token)) {
      setError(copy.codeError);
      return;
    }
    setError(null);
    setPhase('verifying');
    try {
      const { data, error: verifyError } = await createClient().auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      });
      if (verifyError || !data.session) {
        setError(copy.codeError);
        setPhase('code');
        return;
      }
      onSignedIn();
    } catch {
      setError(copy.codeError);
      setPhase('code');
    }
  };

  const inputClass =
    'h-12 w-full rounded-full border-2 border-[#1A1A2E] bg-white px-space-lg text-body-md text-[#1A1A2E] outline-none placeholder:text-[#4A4A5E]/70 focus-visible:ring-2 focus-visible:ring-[#00A6A6]';

  if (phase === 'code' || phase === 'verifying') {
    return (
      <form onSubmit={verify} className="flex flex-col gap-space-sm" data-testid={`${testIdPrefix}-verify-form`}>
        <div
          role="status"
          className={cn('mb-space-xs flex items-start gap-space-sm p-space-md text-[#1A1A2E]', pop.card, 'rounded-2xl bg-[#D6F5E6]')}
          data-testid={`${testIdPrefix}-sent`}
        >
          <span className={cn('flex h-10 w-10 shrink-0 -rotate-3 items-center justify-center rounded-xl bg-[#FFC83D]', pop.outline)}>
            <SymbolIcon name="mark_email_unread" className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <p className="text-body-lg font-bold">{copy.sentTitle}</p>
            <p className="mt-0.5 text-label-md text-[#4A4A5E]">{copy.sentTo}</p>
            <p className="truncate whitespace-nowrap text-body-md font-bold" title={email.trim()}>
              {email.trim()}
            </p>
            <p className="mt-space-xs text-label-md text-[#4A4A5E]">{copy.sentHint}</p>
          </div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="12345678"
          aria-label={copy.codeLabel}
          className={cn(inputClass, 'text-center text-[22px] font-bold tracking-[0.4em]')}
          data-testid={`${testIdPrefix}-code`}
        />
        <Button
          type="submit"
          className={cn(pop.primaryButton, 'h-12 text-label-md')}
          disabled={phase === 'verifying'}
          data-testid={`${testIdPrefix}-verify`}
        >
          {phase === 'verifying' ? copy.verifying : copy.verify}
        </Button>
        {error && (
          <p role="alert" className="text-center text-label-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-center gap-space-md text-label-sm text-[#4A4A5E]">
          <button
            type="button"
            className="min-h-9 underline-offset-2 enabled:hover:underline disabled:opacity-60"
            disabled={waitLeft > 0}
            onClick={() => void send()}
            data-testid={`${testIdPrefix}-resend`}
          >
            {waitLeft > 0 ? copy.resendIn(waitLeft) : copy.resend}
          </button>
          <span aria-hidden>·</span>
          <button
            type="button"
            className="min-h-9 underline-offset-2 hover:underline"
            onClick={() => {
              setPhase('email');
              setError(null);
            }}
          >
            {copy.changeEmail}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-space-sm" data-testid={`${testIdPrefix}-form`}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={messages.onboarding.account.emailPlaceholder}
        aria-label={messages.onboarding.account.emailPlaceholder}
        className={inputClass}
        data-testid={`${testIdPrefix}-email`}
      />
      <Button
        type="submit"
        className={cn(pop.primaryButton, 'h-12 text-label-md')}
        disabled={phase === 'sending'}
        data-testid={`${testIdPrefix}-send`}
      >
        {phase === 'sending' ? copy.sending : copy.send}
      </Button>
      {error && (
        <p role="alert" className="text-center text-label-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
