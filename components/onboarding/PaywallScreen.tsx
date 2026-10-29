'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';
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
};

type PlanCopyKey = 'planWeekly' | 'planMonthly' | 'planYearly' | 'periodWeekly' | 'periodMonthly' | 'periodYearly';

const PLAN_COPY: Record<PlanId, { label: PlanCopyKey; period: PlanCopyKey }> = {
  weekly: { label: 'planWeekly', period: 'periodWeekly' },
  monthly: { label: 'planMonthly', period: 'periodMonthly' },
  yearly: { label: 'planYearly', period: 'periodYearly' },
};

export function PaywallScreen({ titleId, onFinish, context }: PaywallScreenProps) {
  const { messages, language } = useMessages();
  const copy = messages.paywall;
  const [selectedId, setSelectedId] = useState<PlanId>(DEFAULT_PLAN_ID);
  const [purchase, setPurchase] = useState<PurchaseState>('idle');
  const [restore, setRestore] = useState<RestoreOutcome | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const selected = getPlan(selectedId);
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

  const subscribe = async () => {
    setPurchase('pending');
    const outcome = await startCheckout(selectedId);
    if (outcome.kind === 'redirect') window.location.assign(outcome.url);
    else if (outcome.kind === 'reload') window.location.reload();
    else setPurchase(outcome.state);
  };

  const restorePurchases = async () => {
    const outcome = await checkRestore();
    if (outcome === 'reload') window.location.reload();
    else setRestore(outcome);
  };

  const closeButton = (
    <button
      type="button"
      onClick={onFinish}
      className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline"
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
        : null;

  if (notice) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center justify-end px-space-md">{closeButton}</header>
        <div className="flex flex-1 flex-col justify-center px-gutter pb-space-xl" role="status" data-testid={`paywall-${purchase}`}>
          <div className="mb-space-lg flex h-20 w-20 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest">
            <SymbolIcon name={notice.icon} className="text-[40px] text-on-surface" />
          </div>
          <h1 id={titleId} ref={titleRef} tabIndex={-1} className="text-h3 text-on-surface outline-none">
            {notice.title}
          </h1>
          <p className="mt-space-sm text-body-lg text-on-surface-variant">{notice.body}</p>
        </div>
        <footer className="flex shrink-0 flex-col gap-space-sm border-t border-outline-variant px-gutter py-space-md">
          {purchase === 'signInRequired' && (
            <Button asChild className="h-12 w-full">
              <Link href="/settings">{copy.goToSettings}</Link>
            </Button>
          )}
          <Button
            type="button"
            variant={purchase === 'signInRequired' ? 'ghost' : 'default'}
            className="h-12 w-full"
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
      <header className="flex h-14 shrink-0 items-center justify-end px-space-md">{closeButton}</header>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-gutter pb-space-sm">
        <p className="text-label-sm font-medium uppercase tracking-[0.08em] text-on-surface-variant">{copy.title}</p>
        <h1
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="mt-space-xs text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-on-surface outline-none"
        >
          {headline}
        </h1>

        {strip.length > 0 && (
          <ul className="mt-space-sm grid grid-cols-3 gap-space-sm" aria-hidden data-testid="paywall-photo-strip">
            {strip.map((url) => (
              <li key={url} className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-container-high">
                <div className="absolute inset-0 scale-110 blur-[12px]">
                  <ListingPhoto src={url} alt="" variant="thumbnail" sizes="140px" />
                </div>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-space-md space-y-1.5">
          {[copy.benefitListings, copy.benefitMap, copy.benefitAlerts, copy.benefitSupport].map((benefit) => (
            <li key={benefit} className="flex items-start gap-space-sm text-body-md leading-snug text-on-surface">
              <SymbolIcon name="check" className="mt-0.5 text-[18px]" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {typeof context?.proofCount === 'number' && context.proofCount > 0 && (
          <p className="mt-space-sm text-label-sm text-on-surface-variant" data-testid="paywall-proof">
            {copy.proofLine(context.proofCount)}
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
                  'flex w-full items-center gap-space-md rounded-lg border px-space-md py-space-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline',
                  active
                    ? 'border-primary bg-surface-container-lowest'
                    : 'border-outline-variant bg-background hover:bg-surface-container-low',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    active ? 'border-primary' : 'border-outline',
                  )}
                  aria-hidden
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-x-space-sm text-label-md text-on-surface">
                    <span className="shrink-0">{copy[labels.label]}</span>
                    {plan.highlighted && (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium leading-tight text-on-primary">
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
                    <span className="text-label-sm text-on-surface">
                      {copy.perWeek(formatCents(perWeekCents(plan), plan.currency, language))}
                    </span>
                  )}
                  {savings > 0 && (
                    <span className="whitespace-nowrap text-label-sm text-on-surface-variant" data-testid="paywall-savings">
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

      <footer className="shrink-0 border-t border-outline-variant px-gutter pt-space-md pb-space-sm">
        <Button
          type="button"
          className="h-12 w-full"
          disabled={purchase === 'pending'}
          onClick={() => void subscribe()}
          data-testid="paywall-cta"
        >
          {purchase === 'pending' ? copy.pending : copy.cta}
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
