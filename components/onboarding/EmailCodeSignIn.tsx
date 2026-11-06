'use client';

import { useState } from 'react';
import { pop } from '@/components/onboarding/pop-theme';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { cn } from '@/lib/utils';

type Phase = 'email' | 'sending' | 'code' | 'verifying';

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

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !getSupabaseEnv()) {
      setError(copy.sendError);
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
        setError(copy.sendError);
        setPhase('email');
      } else {
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
        <p role="status" className="text-label-md text-[#1A1A2E]">
          {copy.sent(email.trim())}
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456"
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
          <button type="button" className="min-h-9 underline-offset-2 hover:underline" onClick={() => void send()}>
            {copy.resend}
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
