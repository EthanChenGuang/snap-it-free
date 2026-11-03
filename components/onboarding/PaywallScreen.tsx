'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';
import type { OnboardingState } from '@/lib/paywall/onboarding-flow';
import {
  DEFAULT_PLAN_ID,
  PAYWALL_PLANS,
  formatCents,
  getPlan,
  perWeekCents,
  type PlanId,
} from '@/lib/paywall/plans';
import { cn } from '@/lib/utils';

type PaywallScreenProps = {
  purchase: OnboardingState['purchase'];
  titleRef: React.Ref<HTMLHeadingElement>;
  titleId: string;
  onStartPurchase: () => void;
  onFinish: () => void;
};

type PlanCopyKey = 'planWeekly' | 'planMonthly' | 'planYearly' | 'periodWeekly' | 'periodMonthly' | 'periodYearly';

const PLAN_COPY: Record<PlanId, { label: PlanCopyKey; period: PlanCopyKey }> = {
  weekly: { label: 'planWeekly', period: 'periodWeekly' },
  monthly: { label: 'planMonthly', period: 'periodMonthly' },
  yearly: { label: 'planYearly', period: 'periodYearly' },
};


export function PaywallScreen({ purchase, titleRef, titleId, onStartPurchase, onFinish }: PaywallScreenProps) {
  const { messages, language } = useMessages();
  const copy = messages.paywall;
  const [selectedId, setSelectedId] = useState<PlanId>(DEFAULT_PLAN_ID);
  const [restoreChecked, setRestoreChecked] = useState(false);
  const selected = getPlan(selectedId);
  const price = (cents: number) => formatCents(cents, selected.currency, language);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onFinish]);

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

  if (purchase === 'comingSoon') {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center justify-end px-space-md">{closeButton}</header>
        <div className="flex flex-1 flex-col justify-center px-gutter pb-space-xl" role="status">
          <div className="mb-space-lg flex h-20 w-20 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest">
            <SymbolIcon name="schedule" className="text-[40px] text-on-surface" />
          </div>
          <h1
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="text-h3 text-on-surface outline-none"
          >
            {copy.comingSoonTitle}
          </h1>
          <p className="mt-space-sm text-body-lg text-on-surface-variant">{copy.comingSoonBody}</p>
        </div>
        <footer className="shrink-0 border-t border-outline-variant px-gutter py-space-md">
          <Button type="button" className="h-12 w-full" onClick={onFinish} data-testid="paywall-coming-soon-continue">
            {copy.comingSoonContinue}
          </Button>
        </footer>
      </>
    );
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-end px-space-md">{closeButton}</header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-space-md">
        <h1
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-on-surface outline-none"
        >
          {copy.title}
        </h1>
        <p className="mt-space-sm text-body-md text-on-surface-variant">{copy.subtitle}</p>

        <ul className="mt-space-lg space-y-space-sm">
          {[copy.benefitListings, copy.benefitMap, copy.benefitAlerts, copy.benefitSupport].map(
            (benefit) => (
              <li key={benefit} className="flex items-start gap-space-sm text-body-md text-on-surface">
                <SymbolIcon name="check" className="mt-0.5 text-[20px]" />
                <span>{benefit}</span>
              </li>
            ),
          )}
        </ul>


        <div className="mt-space-lg flex flex-col gap-space-sm" role="radiogroup" aria-label={copy.plansLabel}>
          {PAYWALL_PLANS.map((plan) => {
            const active = plan.id === selectedId;
            const labels = PLAN_COPY[plan.id];
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`paywall-plan-${plan.id}`}
                onClick={() => setSelectedId(plan.id)}
                className={cn(
                  'flex min-h-16 w-full items-center gap-space-md rounded-lg border px-space-md py-space-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline',
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
                <span className="flex-1">
                  <span className="flex items-center gap-space-sm text-label-md text-on-surface">
                    {copy[labels.label]}
                    {plan.highlighted && (
                      <span className="rounded-full bg-primary px-space-sm py-0.5 text-label-sm text-on-primary">
                        {copy.bestValue}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-label-sm text-on-surface-variant">
                    {formatCents(plan.priceCents, plan.currency, language)} / {copy[labels.period]}
                  </span>
                </span>
                {plan.periodWeeks > 1 && (
                  <span className="shrink-0 text-label-sm text-on-surface">
                    {copy.perWeek(formatCents(perWeekCents(plan), plan.currency, language))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      <footer className="shrink-0 border-t border-outline-variant px-gutter pt-space-md pb-space-sm">
        <Button type="button" className="h-12 w-full" onClick={onStartPurchase} data-testid="paywall-cta">
          {copy.cta}
        </Button>
        <p className="mt-space-sm text-center text-label-sm text-on-surface-variant" data-testid="paywall-renewal">
          {copy.renewal(price(selected.priceCents), copy[PLAN_COPY[selected.id].period])}
        </p>
        <nav className="mt-space-xs flex items-center justify-center gap-space-md text-label-sm text-on-surface-variant">
          <button
            type="button"
            className="min-h-9 underline-offset-2 hover:underline"
            onClick={() => setRestoreChecked(true)}
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
        {restoreChecked && (
          <p role="status" className="text-center text-label-sm text-on-surface-variant">
            {copy.restoreNothing}
          </p>
        )}
      </footer>
    </>
  );
}
