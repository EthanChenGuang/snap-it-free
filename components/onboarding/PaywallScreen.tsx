'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { EmailCodeSignIn } from '@/components/onboarding/EmailCodeSignIn';
import { pop } from '@/components/onboarding/pop-theme';
import { GoogleMark } from '@/components/onboarding/GoogleMark';
import { SwitchAccountButton } from '@/components/onboarding/SwitchAccountButton';
import { ArrowRight, SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import { isInAppBrowser } from '@/lib/auth/in-app-browser';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useOAuthSignIn } from '@/lib/auth/use-oauth-sign-in';
import { useMessages } from '@/lib/i18n/useMessages';
import { markOnboardingCompleted, urlWithoutForceParam } from '@/lib/paywall/gate';
import { clearResumeState } from '@/lib/paywall/onboarding-flow';
import { savePendingCheckout, takePendingCheckout, type CheckoutSource } from '@/lib/paywall/pending-checkout';
import {
  DEFAULT_PLAN_ID,
  PAYWALL_PLANS,
  formatCents,
  getPlan,
  perWeekCents,
  savingsVsMonthlyPct,
  type PlanId,
} from '@/lib/paywall/plans';
import { checkRestore, startCheckout, type PurchaseState, type RestoreOutcome } from '@/lib/paywall/purchase';
import { cn } from '@/lib/utils';

/** Real, personalized figures carried from the onboarding preview; absent when opened from a locked view. */
export type PaywallContext = {
  cityLabel: string;
  count: number | null;
  photos: string[];
  proofCount: number | null;
};

type PaywallScreenProps = {
  titleId: string;
  onFinish: () => void;
  context?: PaywallContext;
  /** Which surface opened the paywall; scopes the post-Google-redirect checkout resume. */
  source?: CheckoutSource;
  /** Where Google sign-in returns to (the onboarding resumes itself; locked views reopen the paywall). */
  returnPath?: string;
};

type PlanCopyKey = 'planWeekly' | 'planMonthly' | 'planYearly' | 'periodWeekly' | 'periodMonthly' | 'periodYearly';

const PLAN_COPY: Record<PlanId, { label: PlanCopyKey; period: PlanCopyKey }> = {
  weekly: { label: 'planWeekly', period: 'periodWeekly' },
  monthly: { label: 'planMonthly', period: 'periodMonthly' },
  yearly: { label: 'planYearly', period: 'periodYearly' },
};

const BENEFIT_STYLES = [
  { icon: 'grid_view', fill: 'bg-[#FFC9A8]' },
  { icon: 'map', fill: 'bg-[#7FE0B0]' },
  { icon: 'notifications_active', fill: 'bg-[#FFC83D]' },
  { icon: 'favorite', fill: 'bg-[#B69CFF]' },
] as const;

/** Put the first number in the headline on a highlighter sticker; plain text otherwise. */
function HighlightNumber({ text }: { text: string }) {
  const match = text.match(/\d[\d.,\u202f\u00a0]*\d|\d/);
  if (!match || match.index === undefined) return <>{text}</>;
  return (
    <>
      {text.slice(0, match.index)}
      <span className="mx-0.5 inline-block -rotate-2 rounded-full border-2 border-[#1A1A2E] bg-[#FFC83D] px-2 leading-[1.15] shadow-[2px_2px_0_#1A1A2E]">
        {match[0]}
      </span>
      {text.slice(match.index + match[0].length)}
    </>
  );
}

export function PaywallScreen({ titleId, onFinish, context, source = 'locked', returnPath }: PaywallScreenProps) {
  const { messages, language } = useMessages();
  const copy = messages.paywall;
  const [selectedId, setSelectedId] = useState<PlanId>(DEFAULT_PLAN_ID);
  const [purchase, setPurchase] = useState<PurchaseState>('idle');
  const [restore, setRestore] = useState<RestoreOutcome | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [origin, setOrigin] = useState('');
  const [inApp, setInApp] = useState(false);
  const { email } = useAuthSession();
  const selected = getPlan(selectedId);
  const googleReturn = returnPath ?? '/';
  const { signIn: signInWithGoogle, isBusy: googleBusy } = useOAuthSignIn(googleReturn);
  const price = (cents: number) => formatCents(cents, selected.currency, language);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [purchase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onFinish]);

  // Back from a Google sign-in started on this paywall: continue straight to checkout with that plan.
  useEffect(() => {
    setOrigin(window.location.origin);
    setInApp(isInAppBrowser(window.navigator.userAgent));
    const pending = takePendingCheckout(window.sessionStorage, source);
    if (pending) setSelectedId(pending);
    let cancelled = false;
    // A subscriber should never be asked to pay (e.g. onboarding forced with ?onboarding=1).
    void checkRestore().then((status) => {
      if (cancelled) return;
      if (status === 'reload') setPurchase('alreadySubscribed');
      else if (pending) void subscribe(pending);
    });
    return () => {
      cancelled = true;
    };
    // Mount-only: resuming twice would open two checkouts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leave onboarding for good and load the feed without the force param, so the server gate opens it.
  const openFeed = () => {
    markOnboardingCompleted(window.localStorage);
    clearResumeState(window.sessionStorage);
    window.location.assign(urlWithoutForceParam(window.location.href));
  };

  const continueWithGoogle = () => {
    savePendingCheckout(window.sessionStorage, selectedId, source);
    void signInWithGoogle('google');
  };

  const subscribe = async (plan: PlanId = selectedId) => {
    setPurchase('pending');
    const outcome = await startCheckout(plan);
    if (outcome.kind === 'redirect') window.location.assign(outcome.url);
    else setPurchase(outcome.state);
  };

  const restorePurchases = async () => {
    const outcome = await checkRestore();
    if (outcome === 'reload') setPurchase('alreadySubscribed');
    else setRestore(outcome);
  };

  // Signed out on this device: show the sign-in options; signing in again continues to checkout.
  const afterSwitch = () => {
    setRestore(null);
    setPurchase('signInRequired');
  };

  const closeButton = (
    <button
      type="button"
      onClick={onFinish}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1A1A2E] hover:bg-[#FFF3E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]',
        pop.outline,
        pop.shadowSm,
      )}
      aria-label={copy.close}
      data-testid="paywall-close"
    >
      <SymbolIcon name="close" />
    </button>
  );

  const notice =
    purchase === 'comingSoon'
      ? { icon: 'schedule', title: copy.comingSoonTitle, body: copy.comingSoonBody }
      : purchase === 'signInRequired'
        ? { icon: 'person', title: copy.signInTitle, body: copy.signInBody }
        : purchase === 'alreadySubscribed'
          ? { icon: 'verified', title: copy.alreadySubscribedTitle, body: copy.alreadySubscribedBody }
          : null;

  if (notice) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center justify-end px-space-md">{closeButton}</header>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-gutter pb-space-lg" role="status" data-testid={`paywall-${purchase}`}>
          <div className={cn('mb-space-lg flex h-20 w-20 -rotate-3 items-center justify-center rounded-3xl bg-[#FFC83D]', pop.outline, pop.shadow)}>
            <SymbolIcon name={notice.icon} className="text-[40px] text-[#1A1A2E]" />
          </div>
          <h1 id={titleId} ref={titleRef} tabIndex={-1} className={cn(pop.display, 'text-[30px] leading-[1.15] outline-none')}>
            {notice.title}
          </h1>
          <p className="mt-space-sm text-body-lg text-on-surface-variant">{notice.body}</p>
          {purchase === 'alreadySubscribed' && email && (
            <p className="mt-space-md text-label-sm text-on-surface-variant" data-testid="paywall-subscribed-account">
              {messages.onboarding.account.signedInAs(email)}{' '}
              <SwitchAccountButton onSignedOut={afterSwitch} testId="paywall-switch-account" />
            </p>
          )}
        </div>
        <footer className="flex shrink-0 flex-col gap-space-sm px-gutter py-space-md">
          {purchase === 'signInRequired' && (
            <div className="flex flex-col gap-space-sm" data-testid="paywall-sign-in">
              {inApp && (
                <p className="rounded-2xl bg-[#FFF2B8] px-space-md py-space-sm text-label-sm text-[#1A1A2E]">
                  {messages.emailCode.inAppBrowser}
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                className={cn(pop.secondaryButton, 'h-12 shadow-[0_3px_0_#1A1A2E]')}
                disabled={googleBusy}
                onClick={continueWithGoogle}
                data-testid="paywall-google"
              >
                <GoogleMark />
                {messages.onboarding.account.google}
              </Button>
              <EmailCodeSignIn
                emailRedirectTo={`${origin}/auth/callback?next=${encodeURIComponent(googleReturn)}`}
                onSignedIn={() => void subscribe()}
                testIdPrefix="paywall-email"
              />
            </div>
          )}
          {purchase === 'alreadySubscribed' && (
            <Button type="button" className={pop.primaryButton} onClick={openFeed} data-testid="paywall-open-feed">
              {copy.openFeed}
              <ArrowRight />
            </Button>
          )}
          <Button
            type="button"
            variant={purchase === 'signInRequired' || purchase === 'alreadySubscribed' ? 'ghost' : 'default'}
            className={purchase === 'signInRequired' || purchase === 'alreadySubscribed' ? pop.ghostButton : pop.primaryButton}
            onClick={onFinish}
            data-testid="paywall-coming-soon-continue"
          >
            {copy.comingSoonContinue}
          </Button>
        </footer>
      </>
    );
  }

  const hasCount = typeof context?.count === 'number' && context.count > 0;
  const headline = hasCount && context ? copy.titlePersonalized(context.count as number, context.cityLabel) : copy.titleFallback;
  const strip = context?.photos.slice(0, 3) ?? [];

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#FFD9C7] via-[#FFEBC2]/60 to-transparent" aria-hidden />
      <header className="relative flex h-14 shrink-0 items-center justify-between px-space-md">
        <p className="ml-space-xs inline-flex items-center gap-1 rounded-full border-2 border-[#1A1A2E] bg-[#1A1A2E] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
          {copy.title} <span className="text-[#FFC83D]" aria-hidden>⚡</span>
        </p>
        {closeButton}
      </header>

      <div className="no-scrollbar relative flex flex-1 flex-col overflow-y-auto px-gutter pb-space-sm">
        <h1 id={titleId} ref={titleRef} tabIndex={-1} className={cn(pop.display, 'text-[26px] leading-[1.25] outline-none')}>
          <HighlightNumber text={headline} />
        </h1>

        {strip.length > 0 && (
          <ul className="mt-space-sm grid grid-cols-3 gap-space-sm px-space-xs" aria-hidden data-testid="paywall-photo-strip">
            {strip.map((url, index) => (
              <li
                key={url}
                className={cn(
                  'relative aspect-[16/10] overflow-hidden rounded-xl bg-[#F3E2CF]',
                  pop.outline,
                  index === 0 ? '-rotate-3' : index === 2 ? 'rotate-3' : '',
                )}
              >
                <div className="absolute inset-0 scale-110 blur-[10px]">
                  <ListingPhoto src={url} alt="" variant="thumbnail" sizes="140px" />
                </div>
                {index === 1 && (
                  <span className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1A1A2E] bg-[#FFC83D]">
                    <SymbolIcon name="lock" className="text-[15px] text-[#1A1A2E]" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-space-sm space-y-1">
          {[copy.benefitListings, copy.benefitMap, copy.benefitAlerts, copy.benefitSupport].map((benefit, index) => (
            <li key={benefit} className="flex items-center gap-space-sm text-label-md leading-snug text-[#1A1A2E]">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#1A1A2E]',
                  BENEFIT_STYLES[index].fill,
                )}
                aria-hidden
              >
                <SymbolIcon name={BENEFIT_STYLES[index].icon} className="text-[14px]" />
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {typeof context?.proofCount === 'number' && context.proofCount > 0 && (
          <p
            className="mt-space-sm self-start rounded-full bg-[#FFF2B8] px-2.5 py-0.5 text-label-sm font-medium text-[#1A1A2E]"
            data-testid="paywall-proof"
          >
            ✨ {copy.proofLine(context.proofCount)}
          </p>
        )}

        <div className="mt-space-md flex flex-col gap-space-sm" role="radiogroup" aria-label={copy.plansLabel}>
          {PAYWALL_PLANS.map((plan) => {
            const active = plan.id === selectedId;
            const labels = PLAN_COPY[plan.id];
            const savings = savingsVsMonthlyPct(plan);
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`paywall-plan-${plan.id}`}
                onClick={() => setSelectedId(plan.id)}
                className={cn(
                  'relative flex w-full items-center gap-space-md rounded-2xl border-2 px-space-md py-space-sm text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]',
                  active
                    ? 'border-[#1A1A2E] bg-[#FFE9DF] shadow-[3px_3px_0_#F2512D]'
                    : 'border-[#1A1A2E]/25 bg-white hover:border-[#1A1A2E]/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    active ? 'border-[#F2512D]' : 'border-[#1A1A2E]/40',
                  )}
                  aria-hidden
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-[#F2512D]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-x-space-sm text-label-md font-bold text-[#1A1A2E]">
                    <span className="shrink-0">{copy[labels.label]}</span>
                    {plan.highlighted && (
                      <span className="shrink-0 -rotate-2 whitespace-nowrap rounded-full border-2 border-[#1A1A2E] bg-[#FFC83D] px-2 py-0.5 text-[11px] font-bold leading-tight text-[#1A1A2E]">
                        {copy.bestValue}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-label-sm text-on-surface-variant">
                    {formatCents(plan.priceCents, plan.currency, language)} / {copy[labels.period]}
                  </span>
                  {plan.id === 'yearly' && (
                    <span className="mt-0.5 block text-label-sm text-on-surface-variant" data-testid="paywall-billed">
                      {copy.billed(formatCents(plan.priceCents, plan.currency, language))}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                  {plan.periodWeeks > 1 && (
                    <span className="text-label-sm font-bold text-[#1A1A2E]">
                      {copy.perWeek(formatCents(perWeekCents(plan), plan.currency, language))}
                    </span>
                  )}
                  {savings > 0 && (
                    <span className="whitespace-nowrap rounded-full bg-[#00A6A6] px-2 py-0.5 text-[11px] font-bold text-white" data-testid="paywall-savings">
                      {copy.savingsVsMonthly(savings)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {context && (
          <p className="mt-space-sm text-label-sm text-on-surface-variant">{copy.freeNote}</p>
        )}
      </div>

      <footer className="shrink-0 border-t-2 border-[#1A1A2E]/10 bg-[#FFF8EE]/90 px-gutter pt-space-md pb-space-sm backdrop-blur">
        {email && (
          <p className="mb-space-xs text-center text-label-sm text-on-surface-variant" data-testid="paywall-paying-as">
            {messages.onboarding.account.payingAs(email)} ·{' '}
            <SwitchAccountButton onSignedOut={afterSwitch} testId="paywall-switch-account" />
          </p>
        )}
        <Button
          type="button"
          className={pop.primaryButton}
          disabled={purchase === 'pending'}
          onClick={() => void subscribe()}
          data-testid="paywall-cta"
        >
          {purchase === 'pending' ? copy.pending : copy.cta}
          {purchase !== 'pending' && <ArrowRight />}
        </Button>
        {purchase === 'error' && (
          <p role="alert" className="mt-space-sm text-center text-label-sm text-error" data-testid="paywall-checkout-error">
            {copy.checkoutError}
          </p>
        )}
        <p className="mt-space-sm text-center text-label-sm text-on-surface-variant" data-testid="paywall-renewal">
          {copy.renewal(price(selected.priceCents), copy[PLAN_COPY[selected.id].period])}
        </p>
        <nav className="mt-space-xs flex items-center justify-center gap-space-md text-label-sm text-on-surface-variant">
          <button
            type="button"
            className="min-h-9 underline-offset-2 hover:underline"
            onClick={() => void restorePurchases()}
          >
            {copy.restore}
          </button>
          <span aria-hidden>·</span>
          <Link href="/terms" target="_blank" rel="noopener" className="min-h-9 leading-9 underline-offset-2 hover:underline">
            {copy.terms}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" target="_blank" rel="noopener" className="min-h-9 leading-9 underline-offset-2 hover:underline">
            {copy.privacy}
          </Link>
        </nav>
        {restore && (
          <p role="status" className="text-center text-label-sm text-on-surface-variant">
            {restore === 'signIn' ? copy.restoreSignIn : copy.restoreNothing}
          </p>
        )}
      </footer>
    </>
  );
}
