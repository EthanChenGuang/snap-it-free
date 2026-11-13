'use client';

import { useRouter } from 'next/navigation';
import { EmailCodeSignIn } from '@/components/onboarding/EmailCodeSignIn';
import { Button } from '@/components/ui/button';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { useOAuthSignIn } from '@/lib/auth/use-oauth-sign-in';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type AuthPromptFormProps = {
  redirectTo: string;
  heading?: string;
  description?: string;
  id?: string;
  headingId?: string;
  /** Guest preview wall — larger heading as the page's primary action label. */
  prominentHeading?: boolean;
  /** Tighter spacing for one-screen guest preview layouts. */
  compact?: boolean;
};

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

export function AuthPromptForm({
  redirectTo,
  heading,
  description,
  id,
  headingId,
  prominentHeading = false,
  compact = false,
}: AuthPromptFormProps) {
  const { messages } = useMessages();
  const { signIn, status: oauthStatus, isBusy: oauthBusy } = useOAuthSignIn(redirectTo);

  const router = useRouter();
  const isAuthBusy = oauthBusy;

  // useAuthSession picks the new session up from onAuthStateChange; this also refreshes server data
  // and moves to redirectTo when it is a different page than the one shown.
  const handleSignedIn = () => {
    if (redirectTo !== window.location.pathname + window.location.search) router.replace(redirectTo);
    else router.refresh();
  };

  return (
    <div
      id={id}
      className={cn(
        'flex flex-col',
        compact ? 'gap-space-md' : prominentHeading ? 'gap-space-lg' : 'gap-space-md',
      )}
      aria-labelledby={heading && headingId ? headingId : undefined}
    >
      {heading ? (
        <div className={cn('flex flex-col', compact ? 'gap-space-xs' : 'gap-space-xs')}>
          <h2
            id={headingId}
            className={cn(
              'text-on-surface',
              compact &&
                'text-body-lg font-semibold leading-snug tracking-[-0.01em] text-balance',
              !compact &&
                prominentHeading &&
                'text-h3 font-semibold leading-snug tracking-[-0.01em]',
              !compact && !prominentHeading && 'text-label-md font-medium',
            )}
          >
            {heading}
          </h2>
          {description ? (
            <p className="text-body-md text-on-surface-variant">{description}</p>
          ) : null}
        </div>
      ) : null}

      <>
          {compact ? (
            <div className="overflow-hidden rounded-lg border border-outline-variant">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full justify-center rounded-none border-0 bg-surface-container-lowest px-space-md font-normal hover:bg-surface-container"
                disabled={isAuthBusy}
                onClick={() => signIn('google')}
              >
                <GoogleIcon />
                {messages.auth.googleSignIn}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-space-sm">
              <Button
                type="button"
                className={cn(
                  'w-full justify-start px-space-md font-normal min-h-11',
                  prominentHeading && 'bg-surface-container-lowest',
                )}
                disabled={isAuthBusy}
                onClick={() => signIn('google')}
              >
                <GoogleIcon />
                {messages.auth.googleSignIn}
              </Button>
            </div>
          )}
          {oauthStatus === 'error' && (
            <p className="text-label-sm text-error">{messages.auth.oauthError}</p>
          )}

          <div className={cn('flex items-center gap-space-sm', compact && 'py-0')}>
            <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
            <span className="text-label-sm text-on-surface-variant">{messages.auth.orDivider}</span>
            <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
          </div>

          <EmailCodeSignIn
            emailRedirectTo={buildOAuthCallbackUrl(redirectTo, window.location.origin)}
            onSignedIn={handleSignedIn}
            testIdPrefix="auth-prompt"
            tone="plain"
          />
      </>
    </div>
  );
}
