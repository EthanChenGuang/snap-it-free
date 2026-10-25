import type { AppLanguage } from '@/lib/settings/preferences';

// Prices decided by Guang on 2026-10-25. Stripe prices must match these amounts.
export type PlanId = 'weekly' | 'monthly' | 'yearly';

export type PaywallPlan = {
  id: PlanId;
  priceCents: number;
  currency: 'EUR';
  /** Billing period length in weeks, used for the per-week equivalent. */
  periodWeeks: number;
  highlighted: boolean;
};

const WEEKS_PER_YEAR = 52;

export const PAYWALL_PLANS: readonly PaywallPlan[] = [
  { id: 'weekly', priceCents: 199, currency: 'EUR', periodWeeks: 1, highlighted: false },
  { id: 'monthly', priceCents: 499, currency: 'EUR', periodWeeks: WEEKS_PER_YEAR / 12, highlighted: false },
  { id: 'yearly', priceCents: 1999, currency: 'EUR', periodWeeks: WEEKS_PER_YEAR, highlighted: true },
];

export const DEFAULT_PLAN_ID: PlanId =
  PAYWALL_PLANS.find((plan) => plan.highlighted)?.id ?? PAYWALL_PLANS[0].id;

export function getPlan(id: PlanId): PaywallPlan {
  const plan = PAYWALL_PLANS.find((entry) => entry.id === id);
  if (!plan) throw new Error(`Unknown paywall plan: ${id}`);
  return plan;
}

export function perWeekCents(plan: PaywallPlan): number {
  return Math.round(plan.priceCents / plan.periodWeeks);
}

const NUMBER_LOCALE: Record<AppLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-IE',
  it: 'it-IT',
};

export function formatCents(cents: number, currency: PaywallPlan['currency'], language: AppLanguage): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[language], {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
