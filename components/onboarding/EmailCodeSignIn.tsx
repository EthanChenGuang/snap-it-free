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
  tone = 'pop',
  emailInputId,
}: {
  /** Where the emailed link lands if the user taps it instead of typing the code. */
  emailRedirectTo: string;
  onBeforeSend?: () => void;
  onSignedIn: () => void;
  testIdPrefix?: string;
  /** 'plain' = the neutral black/zinc look of the guest auth cards; onboarding keeps 'pop'. */
  tone?: 'pop' | 'plain';
  /** DOM id for the email input (the guest card's heart button focuses it). */
  emailInputId?: string;
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
    const token = code.replace(/\D/g, '');
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
        const wait = verifyError ? waitSeconds(verifyError) : null;
        setError(wait !== null ? copy.waitError(wait) : copy.codeError);
        setPhase('code');
        return;
      }
      onSignedIn();
    } catch {
      setError(copy.codeError);
      setPhase('code');
    }
  };

  const plain = tone === 'plain';
  const inputClass = plain
    ? 'h-11 w-full rounded-xl border border-zinc-200/80 bg-zinc-100/80 px-3.5 text-body-md text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-black/10'
    : 'h-12 w-full rounded-full border-2 border-[#1A1A2E] bg-white px-space-lg text-body-md text-[#1A1A2E] outline-none placeholder:text-[#4A4A5E]/70 focus-visible:ring-2 focus-visible:ring-[#00A6A6]';
  const buttonClass = plain
    ? 'h-11 w-full rounded-xl bg-black text-label-md font-semibold text-white hover:opacity-90 disabled:opacity-50'
    : cn(pop.primaryButton, 'h-12 text-label-md');
  const mutedClass = plain ? 'text-zinc-500' : 'text-[#4A4A5E]';
  const linkClass = cn('underline-offset-2', plain ? 'min-h-11 px-1' : 'min-h-9');

  if (phase === 'code' || phase === 'verifying') {
    return (
      <form onSubmit={verify} className="flex flex-col gap-space-sm" data-testid={`${testIdPrefix}-verify-form`}>
        <div
          role="status"
          className={
            plain
              ? 'flex items-start gap-space-sm rounded-xl bg-zinc-100/80 p-space-sm text-zinc-900'
              : cn('mb-space-xs flex items-start gap-space-sm p-space-md text-[#1A1A2E]', pop.card, 'rounded-2xl bg-[#D6F5E6]')
          }
          data-testid={`${testIdPrefix}-sent`}
        >
          {!plain && (
            <span className={cn('flex h-10 w-10 shrink-0 -rotate-3 items-center justify-center rounded-xl bg-[#FFC83D]', pop.outline)}>
              <SymbolIcon name="mark_email_unread" className="text-[22px]" />
            </span>
          )}
          <div className="min-w-0">
            <p className={plain ? 'text-body-md font-bold' : 'text-body-lg font-bold'}>{copy.sentTitle}</p>
            <p className={cn('mt-0.5 text-label-md', mutedClass)}>{copy.sentTo}</p>
            <p className="truncate whitespace-nowrap text-body-md font-bold" title={email.trim()}>
              {email.trim()}
            </p>
            <p className={cn('mt-space-xs text-label-md', mutedClass)}>{copy.sentHint}</p>
          </div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="12345678"
          aria-label={copy.codeLabel}
          className={cn(inputClass, 'text-center font-bold tracking-[0.4em]', plain ? 'text-xl' : 'text-[22px]')}
          data-testid={`${testIdPrefix}-code`}
        />
        <Button
          type="submit"
          className={buttonClass}
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
        <div className={cn('flex justify-center gap-space-md text-label-sm', plain && 'items-center', mutedClass)}>
          <button
            type="button"
            className={cn(linkClass, 'enabled:hover:underline disabled:opacity-60')}
            disabled={waitLeft > 0}
            onClick={() => void send()}
            data-testid={`${testIdPrefix}-resend`}
          >
            {waitLeft > 0 ? copy.resendIn(waitLeft) : copy.resend}
          </button>
          <span aria-hidden>·</span>
          <button
            type="button"
            className={cn(linkClass, 'hover:underline')}
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
        id={emailInputId}
        placeholder={messages.onboarding.account.emailPlaceholder}
        aria-label={messages.auth.emailLabel}
        className={inputClass}
        data-testid={`${testIdPrefix}-email`}
      />
      <Button
        type="submit"
        className={buttonClass}
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
