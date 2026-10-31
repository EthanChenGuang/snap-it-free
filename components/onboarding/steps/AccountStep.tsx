'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmailCodeSignIn } from '@/components/onboarding/EmailCodeSignIn';
import { GoogleMark } from '@/components/onboarding/GoogleMark';
import { SwitchAccountButton } from '@/components/onboarding/SwitchAccountButton';
import { Button } from '@/components/ui/button';
import { PASTELS, pop } from '@/components/onboarding/pop-theme';
import { Sparkle } from '@/components/onboarding/steps/PhotoCollage';
import { ArrowRight, SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { isInAppBrowser } from '@/lib/auth/in-app-browser';
import { useOAuthSignIn } from '@/lib/auth/use-oauth-sign-in';
import { useMessages } from '@/lib/i18n/useMessages';
import { hasOnboardingForceParam, isAccountSkipStubAllowed } from '@/lib/paywall/gate';
import { cn } from '@/lib/utils';
import type { Messages } from '@/messages';

/** QA-only: lets the `?onboarding=1` preview walk past the required account step without real auth. */
const STUB_AUTH_KEY = 'shoumanwu_onboarding_stub_auth';
const MARKETING_OPTIN_KEY = 'shoumanwu_marketing_optin';

function readStubSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  // Never allow the stub to skip the required account step in a production build.
  if (!isAccountSkipStubAllowed()) return false;
  try {
    return hasOnboardingForceParam(window.location.search) && window.localStorage.getItem(STUB_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

type AccountStepProps = {
  copy: Messages['onboarding']['account'];
  /** The answers this account will keep (city, interests, radius), shown as chips. */
  summary?: string[];
  /** Persist onboarding state before any auth redirect, so the flow resumes at the alerts step. */
  onBeforeRedirect: () => void;
  /** Called when the user is authenticated and chooses to continue. */
  onContinue: () => void;
};

/**
 * Required free account (Guang, 2026-10-28: no "Not now"). Placed after the personal preview so the
 * reason to sign up is to keep the feed/alerts the user just built. Real Google + email code/link
 * auth (the code works when the emailed link opens in another browser). Signed-in users (or the QA stub) see a confirmation and Continue.
 */
export function AccountStep({ copy, summary = [], onBeforeRedirect, onContinue }: AccountStepProps) {
  const { messages } = useMessages();
  const { user, email, loading } = useAuthSession();
  const { signIn, isBusy } = useOAuthSignIn('/?onboarding=resume');
  const [stub, setStub] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [origin, setOrigin] = useState('');
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setStub(readStubSignedIn());
    setOrigin(window.location.origin);
    setInApp(isInAppBrowser(window.navigator.userAgent));
  }, []);

  const signedIn = Boolean(user) || stub;
  const displayEmail = email ?? (stub ? 'preview@zerodollar.local' : null);

  // The answers above stay in this step's state; only the session goes, so the sign-in options come back.
  const clearStub = () => {
    try {
      window.localStorage.removeItem(STUB_AUTH_KEY);
    } catch {
      // ignore
    }
    setStub(false);
  };

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

  const emphasis = copy.emphasis;
  const titleAt = copy.title.indexOf(emphasis);

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pt-space-sm pb-space-md">
        <div className="relative mx-auto mb-space-md h-28 w-60" aria-hidden>
          <span className={cn('absolute left-2 top-3 flex h-24 w-16 -rotate-6 items-center justify-center rounded-2xl bg-[#FFE3D3]', pop.outline, pop.shadowSm)}>
            <SymbolIcon name="smartphone" className="text-[34px] text-[#1A1A2E]" />
          </span>
          <span className={cn('absolute right-0 top-5 flex h-20 w-28 rotate-3 items-center justify-center rounded-2xl bg-[#DDF0FF]', pop.outline, pop.shadowSm)}>
            <SymbolIcon name="laptop_mac" className="text-[38px] text-[#1A1A2E]" />
          </span>
          <span className={cn('absolute left-[86px] top-9 flex h-12 w-12 items-center justify-center rounded-full bg-[#F2512D] text-white', pop.outline)}>
            <SymbolIcon name="sync" className="text-[26px]" />
          </span>
          <span className={cn('absolute left-[92px] -top-1 flex h-8 w-8 rotate-12 items-center justify-center rounded-full bg-[#FFC83D] text-[#1A1A2E]', pop.outline)}>
            <SymbolIcon name="favorite" className="text-[18px]" />
          </span>
          <Sparkle className="-left-2 bottom-0 h-5 w-5 text-[#00A6A6]" />
          <Sparkle className="-right-3 top-0 h-6 w-6 text-[#B69CFF]" />
        </div>
        <h1 id="onboarding-title" tabIndex={-1} className={cn(pop.display, 'text-[32px] leading-[1.2] outline-none')}>
          {titleAt < 0 ? (
            copy.title
          ) : (
            <>
              {copy.title.slice(0, titleAt)}
              <span className="relative mx-0.5 inline-block -rotate-2 rounded-full border-2 border-[#1A1A2E] bg-[#FFC83D] px-2.5 leading-[1.15] shadow-[2px_2px_0_#1A1A2E]">
                {emphasis}
              </span>
              {copy.title.slice(titleAt + emphasis.length)}
            </>
          )}
        </h1>
        <p className="mt-space-sm text-body-lg text-[#4A4A5E]">{copy.body}</p>

        {summary.length > 0 && (
          <ul className={cn('mt-space-md flex flex-wrap gap-space-xs p-space-md', pop.card, 'rounded-2xl')} aria-hidden>
            {summary.map((chip, index) => (
              <li
                key={chip}
                className={cn('rounded-full border-2 border-[#1A1A2E] px-2.5 py-0.5 text-label-sm font-semibold text-[#1A1A2E]', PASTELS[index % PASTELS.length])}
              >
                {chip}
              </li>
            ))}
          </ul>
        )}

        {signedIn && (
          <p
            role="status"
            className={cn('mt-space-md flex items-center gap-space-sm p-space-md text-body-md text-[#1A1A2E]', pop.card, 'rounded-2xl bg-[#D6F5E6]')}
            data-testid="account-signed-in"
          >
            <SymbolIcon name="verified" className="text-[22px] text-[#00A6A6]" />
            {displayEmail ? copy.signedInAs(displayEmail) : copy.signedIn}
          </p>
        )}
        {signedIn && <SwitchAccountButton onSignedOut={clearStub} className="mt-space-sm" testId="account-switch" />}

      </div>

      <footer className="flex shrink-0 flex-col gap-space-sm px-gutter pb-space-md pt-space-sm">
        {signedIn ? (
          <Button type="button" className={pop.primaryButton} onClick={onContinue} data-testid="account-continue">
            {messages.onboarding.continue}
            <ArrowRight />
          </Button>
        ) : (
          <>
            {inApp && (
              <p className="rounded-2xl bg-[#FFF2B8] px-space-md py-space-sm text-label-sm text-[#1A1A2E]" data-testid="account-in-app-hint">
                {messages.emailCode.inAppBrowser}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              className={cn(pop.secondaryButton, 'h-12 shadow-[0_3px_0_#1A1A2E]')}
              disabled={isBusy}
              onClick={withGoogle}
              data-testid="account-google"
            >
              <GoogleMark />
              {copy.google}
            </Button>
            <EmailCodeSignIn
              emailRedirectTo={`${origin}/?onboarding=resume`}
              onBeforeSend={() => {
                persistOptIn();
                onBeforeRedirect();
              }}
              onSignedIn={() => {}}
              testIdPrefix="account-email"
            />
            <label className="mt-space-xs flex items-start gap-space-sm text-label-sm text-[#4A4A5E]">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(event) => setOptIn(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#00A6A6]"
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
