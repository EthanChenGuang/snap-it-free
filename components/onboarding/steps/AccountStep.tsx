'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useOAuthSignIn } from '@/lib/auth/use-oauth-sign-in';
import { useMessages } from '@/lib/i18n/useMessages';
import { hasOnboardingForceParam } from '@/lib/paywall/gate';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { Messages } from '@/messages';

/** QA-only: lets the `?onboarding=1` preview walk past the required account step without real auth. */
const STUB_AUTH_KEY = 'shoumanwu_onboarding_stub_auth';
const MARKETING_OPTIN_KEY = 'shoumanwu_marketing_optin';

function readStubSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return hasOnboardingForceParam(window.location.search) && window.localStorage.getItem(STUB_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

type AccountStepProps = {
  copy: Messages['onboarding']['account'];
  /** Persist onboarding state before any auth redirect, so the flow resumes at the alerts step. */
  onBeforeRedirect: () => void;
  /** Called when the user is authenticated and chooses to continue. */
  onContinue: () => void;
};

/**
 * Required free account (Guang, 2026-10-28: no "Not now"). Placed after the personal preview so the
 * reason to sign up is to keep the feed/alerts the user just built. Real Google + email-link auth,
 * reused from the app. Signed-in users (or the QA stub) see a confirmation and Continue.
 */
export function AccountStep({ copy, onBeforeRedirect, onContinue }: AccountStepProps) {
  const { messages } = useMessages();
  const { user, email, loading } = useAuthSession();
  const { signIn, isBusy } = useOAuthSignIn('/?onboarding=resume');
  const [stub, setStub] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [optIn, setOptIn] = useState(false);

  useEffect(() => setStub(readStubSignedIn()), []);

  const signedIn = Boolean(user) || stub;
  const displayEmail = email ?? (stub ? 'preview@zerodollar.local' : null);

  const persistOptIn = () => {
    try {
      window.localStorage.setItem(MARKETING_OPTIN_KEY, optIn ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const withGoogle = () => {
    persistOptIn();
    onBeforeRedirect();
    void signIn('google');
  };

  const withEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = emailValue.trim();
    if (!trimmed || !getSupabaseEnv()) {
      setEmailState('error');
      return;
    }
    persistOptIn();
    onBeforeRedirect();
    setEmailState('sending');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/?onboarding=resume` },
      });
      setEmailState(error ? 'error' : 'sent');
    } catch {
      setEmailState('error');
    }
  };

  const emphasis = copy.emphasis;
  const titleAt = copy.title.indexOf(emphasis);

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pt-space-lg pb-space-md">
        <div className="mb-space-lg flex h-14 w-14 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <SymbolIcon name="bookmark_heart" className="text-[28px] text-on-surface" />
        </div>
        <h1
          id="onboarding-title"
          tabIndex={-1}
          className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-on-surface outline-none"
        >
          {titleAt < 0 ? (
            copy.title
          ) : (
            <>
              {copy.title.slice(0, titleAt)}
              <span className="underline decoration-2 underline-offset-[6px]">{emphasis}</span>
              {copy.title.slice(titleAt + emphasis.length)}
            </>
          )}
        </h1>
        <p className="mt-space-md text-body-lg text-on-surface-variant">{copy.body}</p>

        {signedIn && (
          <p
            role="status"
            className="mt-space-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface"
            data-testid="account-signed-in"
          >
            {displayEmail ? copy.signedInAs(displayEmail) : copy.signedIn}
          </p>
        )}

        {!signedIn && emailState === 'sent' && (
          <p
            role="status"
            className="mt-space-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface"
          >
            {copy.emailSent}
          </p>
        )}
      </div>

      <footer className="flex shrink-0 flex-col gap-space-sm border-t border-outline-variant px-gutter py-space-md">
        {signedIn ? (
          <Button type="button" className="h-12 w-full text-label-md" onClick={onContinue} data-testid="account-continue">
            {messages.onboarding.continue}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              className="h-12 w-full text-label-md"
              disabled={isBusy}
              onClick={withGoogle}
              data-testid="account-google"
            >
              <SymbolIcon name="login" className="text-[20px]" />
              {copy.google}
            </Button>
            <form onSubmit={withEmail} className="flex flex-col gap-space-sm">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                placeholder={copy.emailPlaceholder}
                aria-label={copy.emailPlaceholder}
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-space-md text-body-md text-on-surface outline-none focus-visible:ring-1 focus-visible:ring-outline"
              />
              <Button
                type="submit"
                variant="secondary"
                className="h-11 w-full"
                disabled={emailState === 'sending'}
                data-testid="account-email"
              >
                {emailState === 'sending' ? copy.emailSending : copy.email}
              </Button>
              {emailState === 'error' && (
                <p role="alert" className="text-center text-label-sm text-error">
                  {copy.emailError}
                </p>
              )}
            </form>
            <label className="mt-space-xs flex items-start gap-space-sm text-label-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(event) => setOptIn(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline"
              />
              <span>{copy.optIn}</span>
            </label>
            {loading && <span className="sr-only">{messages.onboarding.account.body}</span>}
          </>
        )}
      </footer>
    </>
  );
}
